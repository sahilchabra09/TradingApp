CREATE TYPE "public"."account_status" AS ENUM('pending_kyc', 'active', 'suspended', 'closed');--> statement-breakpoint
CREATE TYPE "public"."kyc_status" AS ENUM('not_started', 'pending', 'approved', 'rejected', 'resubmission_required');--> statement-breakpoint
CREATE TYPE "public"."risk_profile" AS ENUM('conservative', 'moderate', 'aggressive');--> statement-breakpoint
CREATE TYPE "public"."asset_type" AS ENUM('stock', 'forex', 'crypto', 'commodity', 'index', 'etf', 'bond');--> statement-breakpoint
CREATE TYPE "public"."exchange" AS ENUM('NYSE', 'NASDAQ', 'LSE', 'SEM', 'FOREX', 'CRYPTO', 'COMMODITY');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'open', 'partially_filled', 'filled', 'cancelled', 'rejected', 'expired');--> statement-breakpoint
CREATE TYPE "public"."order_type" AS ENUM('market', 'limit', 'stop_loss', 'stop_limit', 'trailing_stop');--> statement-breakpoint
CREATE TYPE "public"."side" AS ENUM('buy', 'sell');--> statement-breakpoint
CREATE TYPE "public"."time_in_force" AS ENUM('day', 'gtc', 'ioc', 'fok');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('passport', 'national_id', 'drivers_license', 'proof_of_address', 'bank_statement', 'utility_bill', 'tax_certificate', 'employment_letter');--> statement-breakpoint
CREATE TYPE "public"."verification_method" AS ENUM('manual', 'didit_api', 'onfido', 'jumio', 'other_automated');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('pending', 'under_review', 'approved', 'rejected', 'expired', 'resubmission_required');--> statement-breakpoint
CREATE TYPE "public"."event_category" AS ENUM('authentication', 'trading', 'compliance', 'admin_action', 'system', 'financial', 'security');--> statement-breakpoint
CREATE TYPE "public"."severity" AS ENUM('info', 'warning', 'error', 'critical');--> statement-breakpoint
CREATE TYPE "public"."check_result" AS ENUM('clear', 'warning', 'alert', 'error');--> statement-breakpoint
CREATE TYPE "public"."check_type" AS ENUM('sanctions_screening', 'pep_check', 'adverse_media', 'transaction_monitoring', 'source_of_funds');--> statement-breakpoint
CREATE TYPE "public"."deposit_status" AS ENUM('pending', 'processing', 'cleared', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('bank_transfer', 'card', 'mcb_juice', 'mips', 'crypto', 'mobile_money', 'other');--> statement-breakpoint
CREATE TYPE "public"."withdrawal_status" AS ENUM('pending', 'admin_review', 'approved', 'processing', 'completed', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."login_method" AS ENUM('password', 'social_oauth', 'biometric', '2fa', 'sso');--> statement-breakpoint
CREATE TYPE "public"."alert_type" AS ENUM('price_above', 'price_below', 'percent_change', 'technical_indicator', 'volume_spike');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"phone_number" varchar(20),
	"date_of_birth" timestamp,
	"nationality" varchar(3),
	"residential_address" jsonb,
	"account_status" "account_status" DEFAULT 'pending_kyc' NOT NULL,
	"kyc_status" "kyc_status" DEFAULT 'not_started' NOT NULL,
	"two_factor_enabled" boolean DEFAULT false NOT NULL,
	"two_factor_secret" varchar(255),
	"email_verified" boolean DEFAULT false NOT NULL,
	"phone_verified" boolean DEFAULT false NOT NULL,
	"risk_profile" "risk_profile" DEFAULT 'moderate',
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"currency" varchar(3) NOT NULL,
	"available_balance" numeric(20, 8) DEFAULT '0' NOT NULL,
	"reserved_balance" numeric(20, 8) DEFAULT '0' NOT NULL,
	"total_balance" numeric(20, 8) DEFAULT '0' NOT NULL,
	"last_transaction_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "available_balance_positive" CHECK ("wallets"."available_balance" >= 0),
	CONSTRAINT "reserved_balance_positive" CHECK ("wallets"."reserved_balance" >= 0),
	CONSTRAINT "total_balance_positive" CHECK ("wallets"."total_balance" >= 0),
	CONSTRAINT "total_balance_consistency" CHECK ("wallets"."total_balance" = "wallets"."available_balance" + "wallets"."reserved_balance")
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"symbol" varchar(20) NOT NULL,
	"name" varchar(255) NOT NULL,
	"asset_type" "asset_type" NOT NULL,
	"exchange" "exchange" NOT NULL,
	"isin" varchar(12),
	"cusip" varchar(9),
	"is_tradable" boolean DEFAULT true NOT NULL,
	"min_order_quantity" numeric(20, 8) DEFAULT '0.00000001' NOT NULL,
	"max_order_quantity" numeric(20, 8),
	"tick_size" numeric(20, 8) NOT NULL,
	"lot_size" numeric(20, 8) DEFAULT '1' NOT NULL,
	"trading_hours" jsonb,
	"description" text,
	"sector" varchar(100),
	"industry" varchar(100),
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assets_symbol_unique" UNIQUE("symbol")
);
--> statement-breakpoint
CREATE TABLE "holdings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"quantity" numeric(20, 8) NOT NULL,
	"average_purchase_price" numeric(20, 8) NOT NULL,
	"total_invested" numeric(20, 8) NOT NULL,
	"current_value" numeric(20, 8) NOT NULL,
	"unrealized_pnl" numeric(20, 8) DEFAULT '0' NOT NULL,
	"realized_pnl" numeric(20, 8) DEFAULT '0' NOT NULL,
	"last_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quantity_positive" CHECK ("holdings"."quantity" > 0),
	CONSTRAINT "average_price_positive" CHECK ("holdings"."average_purchase_price" >= 0),
	CONSTRAINT "total_invested_positive" CHECK ("holdings"."total_invested" >= 0)
);
--> statement-breakpoint
CREATE TABLE "trades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"order_type" "order_type" NOT NULL,
	"side" "side" NOT NULL,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"time_in_force" time_in_force DEFAULT 'day' NOT NULL,
	"quantity" numeric(20, 8) NOT NULL,
	"filled_quantity" numeric(20, 8) DEFAULT '0' NOT NULL,
	"remaining_quantity" numeric(20, 8) NOT NULL,
	"limit_price" numeric(20, 8),
	"stop_price" numeric(20, 8),
	"average_execution_price" numeric(20, 8),
	"total_value" numeric(20, 8) DEFAULT '0' NOT NULL,
	"commission" numeric(20, 8) DEFAULT '0' NOT NULL,
	"fees" numeric(20, 8) DEFAULT '0' NOT NULL,
	"net_amount" numeric(20, 8) DEFAULT '0' NOT NULL,
	"broker_order_id" varchar(100),
	"exchange_order_id" varchar(100),
	"rejection_reason" text,
	"placed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"executed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quantity_positive" CHECK ("trades"."quantity" > 0),
	CONSTRAINT "filled_quantity_valid" CHECK ("trades"."filled_quantity" >= 0 AND "trades"."filled_quantity" <= "trades"."quantity"),
	CONSTRAINT "remaining_quantity_valid" CHECK ("trades"."remaining_quantity" = "trades"."quantity" - "trades"."filled_quantity"),
	CONSTRAINT "prices_positive" CHECK (("trades"."limit_price" IS NULL OR "trades"."limit_price" > 0) AND 
		     ("trades"."stop_price" IS NULL OR "trades"."stop_price" > 0) AND
		     ("trades"."average_execution_price" IS NULL OR "trades"."average_execution_price" > 0))
);
--> statement-breakpoint
CREATE TABLE "kyc_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"reviewed_by" uuid,
	"document_type" "document_type" NOT NULL,
	"document_number" text,
	"file_path" text NOT NULL,
	"file_hash" varchar(64) NOT NULL,
	"file_size" varchar(20),
	"mime_type" varchar(100),
	"verification_status" "verification_status" DEFAULT 'pending' NOT NULL,
	"verification_method" "verification_method",
	"verification_provider_id" varchar(255),
	"verification_data" jsonb,
	"issue_date" timestamp,
	"expiry_date" timestamp,
	"review_notes" text,
	"rejection_reason" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"admin_id" uuid,
	"event_type" varchar(100) NOT NULL,
	"event_category" "event_category" NOT NULL,
	"severity" "severity" DEFAULT 'info' NOT NULL,
	"description" text NOT NULL,
	"metadata" jsonb,
	"request_id" uuid,
	"ip_address" "inet",
	"user_agent" text,
	"location" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aml_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"check_type" "check_type" NOT NULL,
	"check_provider" varchar(100) NOT NULL,
	"check_result" "check_result" NOT NULL,
	"risk_score" integer,
	"risk_level" varchar(20),
	"findings" jsonb,
	"provider_check_id" varchar(255),
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"next_check_due" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "risk_score_range" CHECK ("aml_checks"."risk_score" >= 0 AND "aml_checks"."risk_score" <= 100)
);
--> statement-breakpoint
CREATE TABLE "risk_limits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"asset_id" uuid,
	"max_position_size" numeric(20, 8),
	"max_daily_trade_volume" numeric(20, 8),
	"max_order_value" numeric(20, 8),
	"leverage_multiplier" numeric(5, 2),
	"is_active" boolean DEFAULT true NOT NULL,
	"set_by" uuid,
	"reason" text,
	"effective_from" timestamp with time zone DEFAULT now() NOT NULL,
	"effective_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "limits_positive" CHECK (("risk_limits"."max_position_size" IS NULL OR "risk_limits"."max_position_size" > 0) AND
		     ("risk_limits"."max_daily_trade_volume" IS NULL OR "risk_limits"."max_daily_trade_volume" > 0) AND
		     ("risk_limits"."max_order_value" IS NULL OR "risk_limits"."max_order_value" > 0)),
	CONSTRAINT "leverage_valid" CHECK ("risk_limits"."leverage_multiplier" IS NULL OR ("risk_limits"."leverage_multiplier" >= 1 AND "risk_limits"."leverage_multiplier" <= 100))
);
--> statement-breakpoint
CREATE TABLE "deposit_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"wallet_id" uuid NOT NULL,
	"amount" numeric(20, 8) NOT NULL,
	"currency" varchar(3) NOT NULL,
	"payment_method" "payment_method" NOT NULL,
	"payment_provider_id" varchar(100),
	"payment_provider_reference" varchar(255),
	"status" "deposit_status" DEFAULT 'pending' NOT NULL,
	"settlement_date" timestamp with time zone,
	"metadata" jsonb,
	"initiated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "deposit_amount_positive" CHECK ("deposit_transactions"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "withdrawal_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"wallet_id" uuid NOT NULL,
	"amount" numeric(20, 8) NOT NULL,
	"currency" varchar(3) NOT NULL,
	"destination_account" jsonb,
	"status" "withdrawal_status" DEFAULT 'pending' NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"estimated_completion" timestamp with time zone,
	"transaction_reference" varchar(255),
	"payment_provider_id" varchar(100),
	"rejection_reason" text,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "withdrawal_amount_positive" CHECK ("withdrawal_requests"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "session_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_token_hash" varchar(255) NOT NULL,
	"login_method" "login_method" NOT NULL,
	"device_fingerprint" varchar(255),
	"device_name" varchar(255),
	"device_type" varchar(50),
	"os_name" varchar(100),
	"os_version" varchar(50),
	"app_version" varchar(50),
	"user_agent" text,
	"ip_address" "inet" NOT NULL,
	"location" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
	"logged_in_at" timestamp with time zone DEFAULT now() NOT NULL,
	"logged_out_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "session_history_session_token_hash_unique" UNIQUE("session_token_hash")
);
--> statement-breakpoint
CREATE TABLE "price_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"alert_type" "alert_type" NOT NULL,
	"condition_value" numeric(20, 8) NOT NULL,
	"technical_indicator" varchar(50),
	"indicator_parameters" jsonb,
	"custom_message" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"triggered_at" timestamp with time zone,
	"notification_sent" boolean DEFAULT false NOT NULL,
	"repeat_alert" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE "test" CASCADE;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holdings" ADD CONSTRAINT "holdings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holdings" ADD CONSTRAINT "holdings_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_documents" ADD CONSTRAINT "kyc_documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_documents" ADD CONSTRAINT "kyc_documents_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aml_checks" ADD CONSTRAINT "aml_checks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_limits" ADD CONSTRAINT "risk_limits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_limits" ADD CONSTRAINT "risk_limits_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_limits" ADD CONSTRAINT "risk_limits_set_by_users_id_fk" FOREIGN KEY ("set_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deposit_transactions" ADD CONSTRAINT "deposit_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deposit_transactions" ADD CONSTRAINT "deposit_transactions_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_history" ADD CONSTRAINT "session_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_alerts" ADD CONSTRAINT "price_alerts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_alerts" ADD CONSTRAINT "price_alerts_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_account_status_idx" ON "users" USING btree ("account_status");--> statement-breakpoint
CREATE INDEX "users_kyc_status_idx" ON "users" USING btree ("kyc_status");--> statement-breakpoint
CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "wallets_user_currency_unique" ON "wallets" USING btree ("user_id","currency");--> statement-breakpoint
CREATE INDEX "wallets_user_id_idx" ON "wallets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "wallets_currency_idx" ON "wallets" USING btree ("currency");--> statement-breakpoint
CREATE INDEX "assets_symbol_idx" ON "assets" USING btree ("symbol");--> statement-breakpoint
CREATE INDEX "assets_asset_type_idx" ON "assets" USING btree ("asset_type");--> statement-breakpoint
CREATE INDEX "assets_exchange_idx" ON "assets" USING btree ("exchange");--> statement-breakpoint
CREATE INDEX "assets_is_tradable_idx" ON "assets" USING btree ("is_tradable");--> statement-breakpoint
CREATE INDEX "assets_isin_idx" ON "assets" USING btree ("isin");--> statement-breakpoint
CREATE UNIQUE INDEX "holdings_user_asset_unique" ON "holdings" USING btree ("user_id","asset_id");--> statement-breakpoint
CREATE INDEX "holdings_user_id_idx" ON "holdings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "holdings_asset_id_idx" ON "holdings" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "holdings_last_updated_idx" ON "holdings" USING btree ("last_updated_at");--> statement-breakpoint
CREATE INDEX "trades_user_status_placed_idx" ON "trades" USING btree ("user_id","status","placed_at");--> statement-breakpoint
CREATE INDEX "trades_user_asset_idx" ON "trades" USING btree ("user_id","asset_id");--> statement-breakpoint
CREATE INDEX "trades_asset_id_idx" ON "trades" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "trades_status_idx" ON "trades" USING btree ("status");--> statement-breakpoint
CREATE INDEX "trades_side_idx" ON "trades" USING btree ("side");--> statement-breakpoint
CREATE INDEX "trades_placed_at_idx" ON "trades" USING btree ("placed_at");--> statement-breakpoint
CREATE INDEX "trades_executed_at_idx" ON "trades" USING btree ("executed_at");--> statement-breakpoint
CREATE INDEX "kyc_documents_user_id_idx" ON "kyc_documents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "kyc_documents_verification_status_idx" ON "kyc_documents" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX "kyc_documents_document_type_idx" ON "kyc_documents" USING btree ("document_type");--> statement-breakpoint
CREATE INDEX "kyc_documents_expiry_date_idx" ON "kyc_documents" USING btree ("expiry_date");--> statement-breakpoint
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_admin_id_idx" ON "audit_logs" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "audit_logs_event_type_idx" ON "audit_logs" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "audit_logs_event_category_idx" ON "audit_logs" USING btree ("event_category");--> statement-breakpoint
CREATE INDEX "audit_logs_severity_idx" ON "audit_logs" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_ip_address_idx" ON "audit_logs" USING btree ("ip_address");--> statement-breakpoint
CREATE INDEX "audit_logs_request_id_idx" ON "audit_logs" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "aml_checks_user_id_idx" ON "aml_checks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "aml_checks_check_result_idx" ON "aml_checks" USING btree ("check_result");--> statement-breakpoint
CREATE INDEX "aml_checks_checked_at_idx" ON "aml_checks" USING btree ("checked_at");--> statement-breakpoint
CREATE INDEX "aml_checks_next_check_due_idx" ON "aml_checks" USING btree ("next_check_due");--> statement-breakpoint
CREATE INDEX "risk_limits_user_id_idx" ON "risk_limits" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "risk_limits_asset_id_idx" ON "risk_limits" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "risk_limits_is_active_idx" ON "risk_limits" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "risk_limits_effective_from_idx" ON "risk_limits" USING btree ("effective_from");--> statement-breakpoint
CREATE INDEX "deposit_transactions_user_id_idx" ON "deposit_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "deposit_transactions_wallet_id_idx" ON "deposit_transactions" USING btree ("wallet_id");--> statement-breakpoint
CREATE INDEX "deposit_transactions_status_idx" ON "deposit_transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "deposit_transactions_initiated_at_idx" ON "deposit_transactions" USING btree ("initiated_at");--> statement-breakpoint
CREATE INDEX "deposit_transactions_settlement_date_idx" ON "deposit_transactions" USING btree ("settlement_date");--> statement-breakpoint
CREATE INDEX "withdrawal_requests_user_id_idx" ON "withdrawal_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "withdrawal_requests_wallet_id_idx" ON "withdrawal_requests" USING btree ("wallet_id");--> statement-breakpoint
CREATE INDEX "withdrawal_requests_status_idx" ON "withdrawal_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "withdrawal_requests_requested_at_idx" ON "withdrawal_requests" USING btree ("requested_at");--> statement-breakpoint
CREATE INDEX "session_history_user_id_idx" ON "session_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_history_is_active_idx" ON "session_history" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "session_history_logged_in_at_idx" ON "session_history" USING btree ("logged_in_at");--> statement-breakpoint
CREATE INDEX "session_history_ip_address_idx" ON "session_history" USING btree ("ip_address");--> statement-breakpoint
CREATE INDEX "session_history_expires_at_idx" ON "session_history" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "session_history_token_hash_idx" ON "session_history" USING btree ("session_token_hash");--> statement-breakpoint
CREATE INDEX "price_alerts_user_id_idx" ON "price_alerts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "price_alerts_asset_id_idx" ON "price_alerts" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "price_alerts_is_active_idx" ON "price_alerts" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "price_alerts_triggered_at_idx" ON "price_alerts" USING btree ("triggered_at");--> statement-breakpoint
CREATE INDEX "price_alerts_user_asset_active_idx" ON "price_alerts" USING btree ("user_id","asset_id","is_active");