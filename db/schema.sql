-- ============================================================
-- Inventory SaaS — Redshift DDL
-- Schema: inventory
-- ============================================================

CREATE SCHEMA IF NOT EXISTS inventory;


-- ─────────────────────────────────────────────
-- WAREHOUSE NETWORK
-- ─────────────────────────────────────────────

CREATE TABLE inventory.warehouses (
    id              VARCHAR(50)   NOT NULL,
    name            VARCHAR(200)  NOT NULL,
    location_code   VARCHAR(20)   NOT NULL,
    city            VARCHAR(100),
    region          VARCHAR(100),
    pincode         VARCHAR(10),
    stock_units     INT           DEFAULT 0,
    capacity_pct    DECIMAL(5,2)  DEFAULT 0,
    is_active       BOOLEAN       DEFAULT TRUE,
    created_by      VARCHAR(100)  NOT NULL,
    create_dt       TIMESTAMP     NOT NULL DEFAULT GETDATE(),
    updated_by      VARCHAR(100),
    update_dt       TIMESTAMP
)
DISTSTYLE ALL
SORTKEY (is_active, region);


-- Multiple rows allowed; exactly one is_active=TRUE at a time.
-- When a new master sink is set, flip the previous row to is_active=FALSE.
CREATE TABLE inventory.master_sink_config (
    id              VARCHAR(50)   NOT NULL,
    warehouse_id    VARCHAR(50)   NOT NULL,
    warehouse_name  VARCHAR(200),
    is_active       BOOLEAN       DEFAULT TRUE,
    created_by      VARCHAR(100)  NOT NULL,
    create_dt       TIMESTAMP     NOT NULL DEFAULT GETDATE(),
    updated_by      VARCHAR(100),
    update_dt       TIMESTAMP
)
DISTSTYLE ALL
SORTKEY (is_active, create_dt);


CREATE TABLE inventory.donor_settings (
    warehouse_id        VARCHAR(50)   NOT NULL,
    is_participating    BOOLEAN       DEFAULT FALSE,
    is_active           BOOLEAN       DEFAULT TRUE,
    created_by          VARCHAR(100)  NOT NULL,
    create_dt           TIMESTAMP     NOT NULL DEFAULT GETDATE(),
    updated_by          VARCHAR(100),
    update_dt           TIMESTAMP
)
DISTSTYLE ALL
SORTKEY (warehouse_id);


CREATE TABLE inventory.route_pair_overrides (
    donor_warehouse_id  VARCHAR(50)   NOT NULL,
    sink_warehouse_id   VARCHAR(50)   NOT NULL,
    is_active           BOOLEAN       DEFAULT TRUE,
    created_by          VARCHAR(100)  NOT NULL,
    create_dt           TIMESTAMP     NOT NULL DEFAULT GETDATE(),
    updated_by          VARCHAR(100),
    update_dt           TIMESTAMP
)
DISTSTYLE ALL
SORTKEY (donor_warehouse_id);


-- ─────────────────────────────────────────────
-- PRODUCT TAXONOMY
-- shelf_life_override_pct precedence: SKU → Brand → Category → Global
-- ─────────────────────────────────────────────

CREATE TABLE inventory.categories (
    id                      VARCHAR(50)   NOT NULL,
    name                    VARCHAR(200)  NOT NULL,
    shelf_life_override_pct DECIMAL(5,2),        -- NULL = use global default
    is_active               BOOLEAN       DEFAULT TRUE,
    created_by              VARCHAR(100)  NOT NULL,
    create_dt               TIMESTAMP     NOT NULL DEFAULT GETDATE(),
    updated_by              VARCHAR(100),
    update_dt               TIMESTAMP
)
DISTSTYLE ALL
SORTKEY (id);


CREATE TABLE inventory.brands (
    id                      VARCHAR(50)   NOT NULL,
    name                    VARCHAR(200)  NOT NULL,
    category_id             VARCHAR(50)   NOT NULL,
    shelf_life_override_pct DECIMAL(5,2),        -- NULL = fall through to category
    is_active               BOOLEAN       DEFAULT TRUE,
    created_by              VARCHAR(100)  NOT NULL,
    create_dt               TIMESTAMP     NOT NULL DEFAULT GETDATE(),
    updated_by              VARCHAR(100),
    update_dt               TIMESTAMP
)
DISTSTYLE ALL
SORTKEY (category_id, id);


CREATE TABLE inventory.skus (
    id                      VARCHAR(50)   NOT NULL,
    name                    VARCHAR(500)  NOT NULL,
    brand_id                VARCHAR(50)   NOT NULL,
    brand_name              VARCHAR(200),
    category_id             VARCHAR(50)   NOT NULL,
    category_name           VARCHAR(200),
    type                    VARCHAR(20)   NOT NULL,  -- 'standard' | 'op'
    shelf_life_override_pct DECIMAL(5,2),            -- NULL = fall through to brand
    is_ignored              BOOLEAN       DEFAULT FALSE,
    is_active               BOOLEAN       DEFAULT TRUE,
    stock_units             INT           DEFAULT 0,
    created_by              VARCHAR(100)  NOT NULL,
    create_dt               TIMESTAMP     NOT NULL DEFAULT GETDATE(),
    updated_by              VARCHAR(100),
    update_dt               TIMESTAMP
)
DISTSTYLE ALL
SORTKEY (category_id, brand_id);


-- ─────────────────────────────────────────────
-- TRANSFER THRESHOLDS
-- ─────────────────────────────────────────────

CREATE TABLE inventory.thresholds_global (
    id          VARCHAR(50)   NOT NULL DEFAULT 'global',
    cogs_min    DECIMAL(10,2),
    cogs_max    DECIMAL(10,2),
    units_min   INT,
    units_max   INT,
    weight_min  DECIMAL(10,2),
    weight_max  DECIMAL(10,2),
    is_active   BOOLEAN       DEFAULT TRUE,
    created_by  VARCHAR(100)  NOT NULL,
    create_dt   TIMESTAMP     NOT NULL DEFAULT GETDATE(),
    updated_by  VARCHAR(100),
    update_dt   TIMESTAMP
)
DISTSTYLE ALL;


CREATE TABLE inventory.thresholds_category (
    category_id     VARCHAR(50)   NOT NULL,
    category_name   VARCHAR(200),
    cogs_min        DECIMAL(10,2),
    cogs_max        DECIMAL(10,2),
    units_min       INT,
    units_max       INT,
    weight_min      DECIMAL(10,2),
    weight_max      DECIMAL(10,2),
    is_active       BOOLEAN       DEFAULT TRUE,
    created_by      VARCHAR(100)  NOT NULL,
    create_dt       TIMESTAMP     NOT NULL DEFAULT GETDATE(),
    updated_by      VARCHAR(100),
    update_dt       TIMESTAMP
)
DISTSTYLE ALL
SORTKEY (category_id);


CREATE TABLE inventory.thresholds_brand (
    brand_id        VARCHAR(50)   NOT NULL,
    brand_name      VARCHAR(200),
    category_id     VARCHAR(50),
    category_name   VARCHAR(200),
    cogs_min        DECIMAL(10,2),
    cogs_max        DECIMAL(10,2),
    units_min       INT,
    units_max       INT,
    weight_min      DECIMAL(10,2),
    weight_max      DECIMAL(10,2),
    is_active       BOOLEAN       DEFAULT TRUE,
    created_by      VARCHAR(100)  NOT NULL,
    create_dt       TIMESTAMP     NOT NULL DEFAULT GETDATE(),
    updated_by      VARCHAR(100),
    update_dt       TIMESTAMP
)
DISTSTYLE ALL
SORTKEY (brand_id);


-- ─────────────────────────────────────────────
-- PRODUCT CONFIG
-- ─────────────────────────────────────────────

CREATE TABLE inventory.product_config_global (
    id                      VARCHAR(50)   NOT NULL DEFAULT 'global',
    standard_shelf_life_pct DECIMAL(5,2),
    op_shelf_life_pct       DECIMAL(5,2),
    standard_enabled        BOOLEAN,
    op_enabled              BOOLEAN,
    is_active               BOOLEAN       DEFAULT TRUE,
    created_by              VARCHAR(100)  NOT NULL,
    create_dt               TIMESTAMP     NOT NULL DEFAULT GETDATE(),
    updated_by              VARCHAR(100),
    update_dt               TIMESTAMP
)
DISTSTYLE ALL;


-- ─────────────────────────────────────────────
-- INVENTORY CONDITIONS
-- Controls which physical states of inventory are eligible for movement.
-- Seed rows: good, damaged, expired — toggle is_enabled per run.
-- ─────────────────────────────────────────────

CREATE TABLE inventory.inventory_conditions (
    id              VARCHAR(50)   NOT NULL,
    condition_type  VARCHAR(20)   NOT NULL,   -- 'good' | 'damaged' | 'expired'
    description     VARCHAR(500),
    is_enabled      BOOLEAN       DEFAULT FALSE,
    is_active       BOOLEAN       DEFAULT TRUE,
    created_by      VARCHAR(100)  NOT NULL,
    create_dt       TIMESTAMP     NOT NULL DEFAULT GETDATE(),
    updated_by      VARCHAR(100),
    update_dt       TIMESTAMP
)
DISTSTYLE ALL
SORTKEY (condition_type);


-- ─────────────────────────────────────────────
-- BATCH APPROVAL HISTORY
-- batch_runs: one row per engine run
-- batches:    one row per donor warehouse per run
-- ─────────────────────────────────────────────

CREATE TABLE inventory.batch_runs (
    id               VARCHAR(100)  NOT NULL,
    master_sink_id   VARCHAR(50),              -- FK to master_sink_config.id
    master_sink_name VARCHAR(200),
    status           VARCHAR(30)   NOT NULL,   -- 'pending_approval' | 'committed' | 'rejected'
    generated_at     TIMESTAMP,
    committed_by     VARCHAR(100),
    committed_at     TIMESTAMP,
    is_active        BOOLEAN       DEFAULT TRUE,
    created_by       VARCHAR(100)  NOT NULL,
    create_dt        TIMESTAMP     NOT NULL DEFAULT GETDATE(),
    updated_by       VARCHAR(100),
    update_dt        TIMESTAMP
)
DISTKEY (id)
SORTKEY (generated_at, status);


CREATE TABLE inventory.batches (
    id           VARCHAR(100)  NOT NULL,
    master_id    VARCHAR(100)  NOT NULL,   -- FK to batch_runs.id
    wh_id        VARCHAR(50)   NOT NULL,   -- donor warehouse
    wh_name      VARCHAR(200),
    status       VARCHAR(30)   NOT NULL,   -- 'pending' | 'committed' | 'rejected'
    generated_at TIMESTAMP,
    committed_by VARCHAR(100),
    committed_at TIMESTAMP,
    is_active    BOOLEAN       DEFAULT TRUE,
    created_by   VARCHAR(100)  NOT NULL,
    create_dt    TIMESTAMP     NOT NULL DEFAULT GETDATE(),
    updated_by   VARCHAR(100),
    update_dt    TIMESTAMP
)
DISTKEY (master_id)
SORTKEY (master_id, generated_at);
