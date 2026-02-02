--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: customer_invoice_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.customer_invoice_enum AS ENUM (
    'DRAFT',
    'POSTED',
    'PAID'
);


ALTER TYPE public.customer_invoice_enum OWNER TO postgres;

--
-- Name: gl_account_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.gl_account_enum AS ENUM (
    'ASSET',
    'LIABILITY',
    'EQUITY',
    'INCOME',
    'EXPENSE'
);


ALTER TYPE public.gl_account_enum OWNER TO postgres;

--
-- Name: journal_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.journal_type_enum AS ENUM (
    'SALES',
    'PURCHASE',
    'PAYMENT',
    'RECEIPT',
    'ADJUSTMENT',
    'OPENING'
);


ALTER TYPE public.journal_type_enum OWNER TO postgres;

--
-- Name: move_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.move_type_enum AS ENUM (
    'INBOUND',
    'OUTBOUND',
    'TRANSFER',
    'ADJUSTMENT'
);


ALTER TYPE public.move_type_enum OWNER TO postgres;

--
-- Name: party_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.party_enum AS ENUM (
    'SUPPLIER',
    'CUSTOMER',
    'BOTH',
    'OTHER'
);


ALTER TYPE public.party_enum OWNER TO postgres;

--
-- Name: payment_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.payment_enum AS ENUM (
    'RECEIPT',
    'PAYMENT'
);


ALTER TYPE public.payment_enum OWNER TO postgres;

--
-- Name: payment_enum_method; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.payment_enum_method AS ENUM (
    'CASH',
    'BANK TRANSFER'
);


ALTER TYPE public.payment_enum_method OWNER TO postgres;

--
-- Name: price_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.price_type_enum AS ENUM (
    'RETAIL',
    'WHOLESALE',
    'DISTRIBUTER'
);


ALTER TYPE public.price_type_enum OWNER TO postgres;

--
-- Name: purchase_order_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.purchase_order_enum AS ENUM (
    'DRAFT',
    'APPROVED',
    'RECIEVED',
    'CLOSED',
    'CANCELLED'
);


ALTER TYPE public.purchase_order_enum OWNER TO postgres;

--
-- Name: source_doc_id_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.source_doc_id_enum AS ENUM (
    'POLYMORPHIC',
    'RELATIONSHIP'
);


ALTER TYPE public.source_doc_id_enum OWNER TO postgres;

--
-- Name: source_doctype_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.source_doctype_enum AS ENUM (
    'PURCHASE ORDER',
    'SALE ORDER',
    'GRN',
    'INVOICE'
);


ALTER TYPE public.source_doctype_enum OWNER TO postgres;

--
-- Name: supplier_invoice_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.supplier_invoice_enum AS ENUM (
    'DRAFT',
    'POSTED',
    'PAID',
    'PARTIAL'
);


ALTER TYPE public.supplier_invoice_enum OWNER TO postgres;

--
-- Name: user_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_role AS ENUM (
    'ADMIN',
    'MANAGER',
    'STAFF',
    'ACCOUNTANT',
    'WAREHOUSE_USER',
    'WAREHOUSE_SUPPERVISOR',
    'WAREHOUSE_CUSTOMER'
);


ALTER TYPE public.user_role OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: accountbalance; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.accountbalance (
    acc_bal_id integer NOT NULL,
    gl_account_id integer NOT NULL,
    period character varying(50) NOT NULL,
    opening_balance numeric(15,2) DEFAULT 0.00,
    debit_total numeric(15,2) DEFAULT 0.00,
    credit_total numeric(15,2) DEFAULT 0.00,
    closing_balance numeric(15,2) DEFAULT 0.00
);


ALTER TABLE public.accountbalance OWNER TO postgres;

--
-- Name: addresses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.addresses (
    address_id integer NOT NULL,
    party_id uuid NOT NULL,
    line1 character varying(255) NOT NULL,
    line2 character varying(255),
    city character varying(100),
    postal_code character varying(20),
    country character varying(100)
);


ALTER TABLE public.addresses OWNER TO postgres;

--
-- Name: batch; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.batch (
    batch_id integer NOT NULL,
    product_id uuid NOT NULL,
    batch_number character varying(100) NOT NULL,
    manufacturing_date date,
    expiry_date date,
    received_quantity numeric(15,0) NOT NULL,
    available_quantity numeric(15,0) NOT NULL,
    status character varying(50) NOT NULL,
    location_id integer
);


ALTER TABLE public.batch OWNER TO postgres;

--
-- Name: batch_batch_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.batch_batch_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.batch_batch_id_seq OWNER TO postgres;

--
-- Name: batch_batch_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.batch_batch_id_seq OWNED BY public.batch.batch_id;


--
-- Name: customerinvoice; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customerinvoice (
    cust_inv_id integer NOT NULL,
    cust_invoice_number character varying(50),
    party_id_customer uuid NOT NULL,
    cust_invoice_date date NOT NULL,
    cust_inv_due_date date,
    total_amount numeric(15,2) DEFAULT 0.00,
    status public.customer_invoice_enum NOT NULL,
    so_id integer
);


ALTER TABLE public.customerinvoice OWNER TO postgres;

--
-- Name: customerinvoice_cust_inv_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.customerinvoice_cust_inv_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.customerinvoice_cust_inv_id_seq OWNER TO postgres;

--
-- Name: customerinvoice_cust_inv_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.customerinvoice_cust_inv_id_seq OWNED BY public.customerinvoice.cust_inv_id;


--
-- Name: customerinvoiceline; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customerinvoiceline (
    cust_inv_line_id integer NOT NULL,
    cust_inv_id integer NOT NULL,
    product_id uuid,
    quantity numeric(15,0) NOT NULL,
    unit_price numeric(15,4) NOT NULL,
    discount numeric(5,2) DEFAULT 0.00,
    tax_id integer,
    line_total numeric(15,2) NOT NULL
);


ALTER TABLE public.customerinvoiceline OWNER TO postgres;

--
-- Name: customerinvoiceline_cust_inv_line_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.customerinvoiceline_cust_inv_line_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.customerinvoiceline_cust_inv_line_id_seq OWNER TO postgres;

--
-- Name: customerinvoiceline_cust_inv_line_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.customerinvoiceline_cust_inv_line_id_seq OWNED BY public.customerinvoiceline.cust_inv_line_id;


--
-- Name: deliverynote; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.deliverynote (
    delv_note_id integer NOT NULL,
    delivery_number character varying(50),
    so_id integer,
    delv_date date NOT NULL,
    delivered_by character varying(100),
    status character varying(50)
);


ALTER TABLE public.deliverynote OWNER TO postgres;

--
-- Name: deliverynote_delv_note_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.deliverynote_delv_note_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.deliverynote_delv_note_id_seq OWNER TO postgres;

--
-- Name: deliverynote_delv_note_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.deliverynote_delv_note_id_seq OWNED BY public.deliverynote.delv_note_id;


--
-- Name: deliverynoteline; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.deliverynoteline (
    delv_note_line_id integer NOT NULL,
    delv_note_id integer NOT NULL,
    product_id uuid NOT NULL,
    delivered_qty numeric(15,0) NOT NULL,
    uom_id integer NOT NULL,
    batch_id integer,
    so_line_id integer,
    remarks text
);


ALTER TABLE public.deliverynoteline OWNER TO postgres;

--
-- Name: deliverynoteline_delv_note_line_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.deliverynoteline_delv_note_line_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.deliverynoteline_delv_note_line_id_seq OWNER TO postgres;

--
-- Name: deliverynoteline_delv_note_line_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.deliverynoteline_delv_note_line_id_seq OWNED BY public.deliverynoteline.delv_note_line_id;


--
-- Name: glaccount; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.glaccount (
    gl_account_id integer NOT NULL,
    gl_account_code character varying(50) NOT NULL,
    parent_account_id integer,
    name character varying(255) NOT NULL,
    type character varying(50) NOT NULL,
    is_control_account boolean DEFAULT false,
    controled_by character varying(50)
);


ALTER TABLE public.glaccount OWNER TO postgres;

--
-- Name: grn; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.grn (
    grn_id integer NOT NULL,
    grn_number character varying(50),
    po_id integer,
    received_date date NOT NULL,
    received_by character varying(100),
    status character varying(50)
);


ALTER TABLE public.grn OWNER TO postgres;

--
-- Name: grn_grn_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.grn_grn_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.grn_grn_id_seq OWNER TO postgres;

--
-- Name: grn_grn_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.grn_grn_id_seq OWNED BY public.grn.grn_id;


--
-- Name: grnline; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.grnline (
    grn_line_id integer NOT NULL,
    grn_id integer NOT NULL,
    product_id uuid NOT NULL,
    received_qty numeric(15,4) NOT NULL,
    uom_id integer NOT NULL,
    batch_id integer,
    expiry_date date,
    po_line_id integer,
    remarks text
);


ALTER TABLE public.grnline OWNER TO postgres;

--
-- Name: grnline_grn_line_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.grnline_grn_line_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.grnline_grn_line_id_seq OWNER TO postgres;

--
-- Name: grnline_grn_line_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.grnline_grn_line_id_seq OWNED BY public.grnline.grn_line_id;


--
-- Name: journalentry; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.journalentry (
    journal_entry_id integer NOT NULL,
    journal_number character varying(50) NOT NULL,
    journal_type public.journal_type_enum NOT NULL,
    date date NOT NULL,
    narration text,
    posted_by character varying(100),
    posted_at timestamp with time zone,
    source_type character varying(100),
    source_id integer
);


ALTER TABLE public.journalentry OWNER TO postgres;

--
-- Name: journalentry_journal_entry_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.journalentry_journal_entry_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.journalentry_journal_entry_id_seq OWNER TO postgres;

--
-- Name: journalentry_journal_entry_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.journalentry_journal_entry_id_seq OWNED BY public.journalentry.journal_entry_id;


--
-- Name: journalline; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.journalline (
    journal_line_id integer NOT NULL,
    journal_entry_id integer NOT NULL,
    gl_account_id integer NOT NULL,
    debit numeric(15,2) DEFAULT 0.00,
    credit numeric(15,2) DEFAULT 0.00,
    party_id_sub_ledger uuid,
    cost_center_id integer
);


ALTER TABLE public.journalline OWNER TO postgres;

--
-- Name: journalline_journal_line_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.journalline_journal_line_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.journalline_journal_line_id_seq OWNER TO postgres;

--
-- Name: journalline_journal_line_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.journalline_journal_line_id_seq OWNED BY public.journalline.journal_line_id;


--
-- Name: party; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.party (
    party_id uuid NOT NULL,
    type public.party_enum NOT NULL,
    name character varying(255) NOT NULL,
    tax_id integer,
    email character varying(100),
    phone character varying(50),
    user_id integer
);


ALTER TABLE public.party OWNER TO postgres;

--
-- Name: payment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment (
    payment_id integer NOT NULL,
    payment_number character varying(50),
    party_id uuid,
    payment_date date NOT NULL,
    payment_type public.payment_enum NOT NULL,
    method public.payment_enum_method NOT NULL,
    amount numeric(15,2) NOT NULL,
    reference_number character varying(100),
    created_by character varying(100),
    created_at timestamp with time zone
);


ALTER TABLE public.payment OWNER TO postgres;

--
-- Name: payment_payment_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payment_payment_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payment_payment_id_seq OWNER TO postgres;

--
-- Name: payment_payment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payment_payment_id_seq OWNED BY public.payment.payment_id;


--
-- Name: paymentallocation; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.paymentallocation (
    payment_allocation_id integer NOT NULL,
    payment_id integer NOT NULL,
    cust_inv_id integer,
    suppl_inv_id integer,
    allocated_amount numeric(15,2) NOT NULL,
    remarks text
);


ALTER TABLE public.paymentallocation OWNER TO postgres;

--
-- Name: paymentallocation_payment_allocation_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.paymentallocation_payment_allocation_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.paymentallocation_payment_allocation_id_seq OWNER TO postgres;

--
-- Name: paymentallocation_payment_allocation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.paymentallocation_payment_allocation_id_seq OWNED BY public.paymentallocation.payment_allocation_id;


--
-- Name: product; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product (
    product_id uuid NOT NULL,
    sku_code character varying(50),
    name character varying(255) NOT NULL,
    description text,
    product_cat_id integer,
    uom_id integer NOT NULL,
    hsn_code character varying(50),
    brand character varying(100)
);


ALTER TABLE public.product OWNER TO postgres;

--
-- Name: productcategory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.productcategory (
    product_category_id integer NOT NULL,
    category character varying(50),
    description text
);


ALTER TABLE public.productcategory OWNER TO postgres;

--
-- Name: productprice; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.productprice (
    prod_price_id integer NOT NULL,
    product_id uuid NOT NULL,
    price_type public.price_type_enum NOT NULL,
    currency character varying(10),
    uom_id integer NOT NULL,
    unit_price numeric(15,4) NOT NULL,
    effective_from date NOT NULL,
    effective_to date,
    tax_id integer
);


ALTER TABLE public.productprice OWNER TO postgres;

--
-- Name: province; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.province (
    province_id integer NOT NULL,
    name character varying(100)
);


ALTER TABLE public.province OWNER TO postgres;

--
-- Name: purchaseorder; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.purchaseorder (
    po_id integer NOT NULL,
    party_id_supplier uuid NOT NULL,
    order_date date NOT NULL,
    expected_del_date date,
    status public.purchase_order_enum NOT NULL,
    total_amount numeric(15,2) DEFAULT 0.00
);


ALTER TABLE public.purchaseorder OWNER TO postgres;

--
-- Name: purchaseorder_po_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.purchaseorder_po_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.purchaseorder_po_id_seq OWNER TO postgres;

--
-- Name: purchaseorder_po_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.purchaseorder_po_id_seq OWNED BY public.purchaseorder.po_id;


--
-- Name: purchaseorderline; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.purchaseorderline (
    po_line_id integer NOT NULL,
    po_id integer NOT NULL,
    product_id uuid NOT NULL,
    quantity numeric(15,4) NOT NULL,
    uom_id integer NOT NULL,
    unit_price numeric(15,4) NOT NULL,
    line_total numeric(15,2) NOT NULL,
    tax_id integer
);


ALTER TABLE public.purchaseorderline OWNER TO postgres;

--
-- Name: purchaseorderline_po_line_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.purchaseorderline_po_line_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.purchaseorderline_po_line_id_seq OWNER TO postgres;

--
-- Name: purchaseorderline_po_line_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.purchaseorderline_po_line_id_seq OWNED BY public.purchaseorderline.po_line_id;


--
-- Name: salesorder; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.salesorder (
    so_id integer NOT NULL,
    party_id_customer uuid NOT NULL,
    order_date date NOT NULL,
    expected_del_date date,
    status public.purchase_order_enum NOT NULL,
    total_amount numeric(15,2) DEFAULT 0.00
);


ALTER TABLE public.salesorder OWNER TO postgres;

--
-- Name: salesorder_so_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.salesorder_so_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.salesorder_so_id_seq OWNER TO postgres;

--
-- Name: salesorder_so_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.salesorder_so_id_seq OWNED BY public.salesorder.so_id;


--
-- Name: salesorderline; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.salesorderline (
    so_line_id integer NOT NULL,
    so_id integer NOT NULL,
    product_id uuid NOT NULL,
    quantity numeric(15,4) NOT NULL,
    uom_id integer NOT NULL,
    unit_price numeric(15,4) NOT NULL,
    line_total numeric(15,2) NOT NULL,
    tax_id integer
);


ALTER TABLE public.salesorderline OWNER TO postgres;

--
-- Name: salesorderline_so_line_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.salesorderline_so_line_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.salesorderline_so_line_id_seq OWNER TO postgres;

--
-- Name: salesorderline_so_line_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.salesorderline_so_line_id_seq OWNED BY public.salesorderline.so_line_id;


--
-- Name: stockitem; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stockitem (
    stock_item_id integer NOT NULL,
    product_id uuid NOT NULL,
    warehouse_id integer NOT NULL,
    uom_id integer NOT NULL,
    quantity_on_hand numeric(15,4) DEFAULT 0.00,
    reorder_point numeric(15,4),
    reserved_quantity numeric(15,4) DEFAULT 0.00
);


ALTER TABLE public.stockitem OWNER TO postgres;

--
-- Name: stockitem_stock_item_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.stockitem_stock_item_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.stockitem_stock_item_id_seq OWNER TO postgres;

--
-- Name: stockitem_stock_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.stockitem_stock_item_id_seq OWNED BY public.stockitem.stock_item_id;


--
-- Name: stockmovement; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stockmovement (
    stock_mov_id integer NOT NULL,
    mov_type public.move_type_enum NOT NULL,
    source_doctype public.source_doctype_enum,
    source_doc_id public.source_doc_id_enum,
    product_id uuid NOT NULL,
    warehouse_from_id integer,
    warehouse_to_id integer,
    quantity numeric(15,4) NOT NULL,
    uom_id integer NOT NULL,
    batch_id integer,
    posted_at timestamp with time zone
);


ALTER TABLE public.stockmovement OWNER TO postgres;

--
-- Name: stockmovement_stock_mov_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.stockmovement_stock_mov_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.stockmovement_stock_mov_id_seq OWNER TO postgres;

--
-- Name: stockmovement_stock_mov_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.stockmovement_stock_mov_id_seq OWNED BY public.stockmovement.stock_mov_id;


--
-- Name: supplierinvoice; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.supplierinvoice (
    suppl_inv_id integer NOT NULL,
    suppl_invoice_number character varying(50),
    party_id uuid NOT NULL,
    suppl_invoice_date date NOT NULL,
    suppl_inv_due_date date,
    amount_untaxed numeric(15,2) DEFAULT 0.00,
    tax_amount numeric(15,2) DEFAULT 0.00,
    total_amount numeric(15,2) DEFAULT 0.00,
    status public.supplier_invoice_enum NOT NULL,
    po_id integer
);


ALTER TABLE public.supplierinvoice OWNER TO postgres;

--
-- Name: supplierinvoiceline; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.supplierinvoiceline (
    suppl_inv_line_id integer NOT NULL,
    suppl_inv_id integer NOT NULL,
    product_id uuid,
    quantity numeric(15,0) NOT NULL,
    unit_price numeric(15,4) NOT NULL,
    tax_id integer,
    line_total numeric(15,2) NOT NULL
);


ALTER TABLE public.supplierinvoiceline OWNER TO postgres;

--
-- Name: tax; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tax (
    tax_id integer NOT NULL,
    name character varying(255) NOT NULL,
    rate numeric(5,4),
    type character varying(50) NOT NULL,
    context character varying(50),
    gl_account_id integer
);


ALTER TABLE public.tax OWNER TO postgres;

--
-- Name: uom; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.uom (
    uom_id integer NOT NULL,
    name character varying(100) NOT NULL,
    conversion_to_base numeric(10,4)
);


ALTER TABLE public.uom OWNER TO postgres;

--
-- Name: user; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."user" (
    user_id integer NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(100) NOT NULL,
    password character varying(255) NOT NULL,
    role public.user_role DEFAULT 'STAFF'::public.user_role NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL
);


ALTER TABLE public."user" OWNER TO postgres;

--
-- Name: user_user_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_user_id_seq OWNER TO postgres;

--
-- Name: user_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_user_id_seq OWNED BY public."user".user_id;


--
-- Name: warehouse; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.warehouse (
    warehouse_id integer NOT NULL,
    name character varying(50),
    location integer,
    type character varying(50)
);


ALTER TABLE public.warehouse OWNER TO postgres;

--
-- Name: warehouse_warehouse_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.warehouse_warehouse_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.warehouse_warehouse_id_seq OWNER TO postgres;

--
-- Name: warehouse_warehouse_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.warehouse_warehouse_id_seq OWNED BY public.warehouse.warehouse_id;


--
-- Name: batch batch_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.batch ALTER COLUMN batch_id SET DEFAULT nextval('public.batch_batch_id_seq'::regclass);


--
-- Name: customerinvoice cust_inv_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customerinvoice ALTER COLUMN cust_inv_id SET DEFAULT nextval('public.customerinvoice_cust_inv_id_seq'::regclass);


--
-- Name: customerinvoiceline cust_inv_line_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customerinvoiceline ALTER COLUMN cust_inv_line_id SET DEFAULT nextval('public.customerinvoiceline_cust_inv_line_id_seq'::regclass);


--
-- Name: deliverynote delv_note_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deliverynote ALTER COLUMN delv_note_id SET DEFAULT nextval('public.deliverynote_delv_note_id_seq'::regclass);


--
-- Name: deliverynoteline delv_note_line_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deliverynoteline ALTER COLUMN delv_note_line_id SET DEFAULT nextval('public.deliverynoteline_delv_note_line_id_seq'::regclass);


--
-- Name: grn grn_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grn ALTER COLUMN grn_id SET DEFAULT nextval('public.grn_grn_id_seq'::regclass);


--
-- Name: grnline grn_line_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grnline ALTER COLUMN grn_line_id SET DEFAULT nextval('public.grnline_grn_line_id_seq'::regclass);


--
-- Name: journalentry journal_entry_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.journalentry ALTER COLUMN journal_entry_id SET DEFAULT nextval('public.journalentry_journal_entry_id_seq'::regclass);


--
-- Name: journalline journal_line_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.journalline ALTER COLUMN journal_line_id SET DEFAULT nextval('public.journalline_journal_line_id_seq'::regclass);


--
-- Name: payment payment_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment ALTER COLUMN payment_id SET DEFAULT nextval('public.payment_payment_id_seq'::regclass);


--
-- Name: paymentallocation payment_allocation_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.paymentallocation ALTER COLUMN payment_allocation_id SET DEFAULT nextval('public.paymentallocation_payment_allocation_id_seq'::regclass);


--
-- Name: purchaseorder po_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchaseorder ALTER COLUMN po_id SET DEFAULT nextval('public.purchaseorder_po_id_seq'::regclass);


--
-- Name: purchaseorderline po_line_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchaseorderline ALTER COLUMN po_line_id SET DEFAULT nextval('public.purchaseorderline_po_line_id_seq'::regclass);


--
-- Name: salesorder so_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salesorder ALTER COLUMN so_id SET DEFAULT nextval('public.salesorder_so_id_seq'::regclass);


--
-- Name: salesorderline so_line_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salesorderline ALTER COLUMN so_line_id SET DEFAULT nextval('public.salesorderline_so_line_id_seq'::regclass);


--
-- Name: stockitem stock_item_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stockitem ALTER COLUMN stock_item_id SET DEFAULT nextval('public.stockitem_stock_item_id_seq'::regclass);


--
-- Name: stockmovement stock_mov_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stockmovement ALTER COLUMN stock_mov_id SET DEFAULT nextval('public.stockmovement_stock_mov_id_seq'::regclass);


--
-- Name: user user_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."user" ALTER COLUMN user_id SET DEFAULT nextval('public.user_user_id_seq'::regclass);


--
-- Name: warehouse warehouse_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouse ALTER COLUMN warehouse_id SET DEFAULT nextval('public.warehouse_warehouse_id_seq'::regclass);


--
-- Data for Name: accountbalance; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.accountbalance (acc_bal_id, gl_account_id, period, opening_balance, debit_total, credit_total, closing_balance) FROM stdin;
\.


--
-- Data for Name: addresses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.addresses (address_id, party_id, line1, line2, city, postal_code, country) FROM stdin;
\.


--
-- Data for Name: batch; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.batch (batch_id, product_id, batch_number, manufacturing_date, expiry_date, received_quantity, available_quantity, status, location_id) FROM stdin;
4	4a0010cf-329c-41f0-ae68-1d239ed3e9bd	452561561	2026-01-27	2026-01-31	1500	1500	ACTIVE	\N
\.


--
-- Data for Name: customerinvoice; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.customerinvoice (cust_inv_id, cust_invoice_number, party_id_customer, cust_invoice_date, cust_inv_due_date, total_amount, status, so_id) FROM stdin;
\.


--
-- Data for Name: customerinvoiceline; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.customerinvoiceline (cust_inv_line_id, cust_inv_id, product_id, quantity, unit_price, discount, tax_id, line_total) FROM stdin;
\.


--
-- Data for Name: deliverynote; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.deliverynote (delv_note_id, delivery_number, so_id, delv_date, delivered_by, status) FROM stdin;
\.


--
-- Data for Name: deliverynoteline; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.deliverynoteline (delv_note_line_id, delv_note_id, product_id, delivered_qty, uom_id, batch_id, so_line_id, remarks) FROM stdin;
\.


--
-- Data for Name: glaccount; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.glaccount (gl_account_id, gl_account_code, parent_account_id, name, type, is_control_account, controled_by) FROM stdin;
\.


--
-- Data for Name: grn; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.grn (grn_id, grn_number, po_id, received_date, received_by, status) FROM stdin;
11	GRN-1769547069581	1	2026-01-27	\N	COMPLETED
\.


--
-- Data for Name: grnline; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.grnline (grn_line_id, grn_id, product_id, received_qty, uom_id, batch_id, expiry_date, po_line_id, remarks) FROM stdin;
4	11	4a0010cf-329c-41f0-ae68-1d239ed3e9bd	1500.0000	1	4	2026-01-31	\N	Received through GRN process
\.


--
-- Data for Name: journalentry; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.journalentry (journal_entry_id, journal_number, journal_type, date, narration, posted_by, posted_at, source_type, source_id) FROM stdin;
\.


--
-- Data for Name: journalline; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.journalline (journal_line_id, journal_entry_id, gl_account_id, debit, credit, party_id_sub_ledger, cost_center_id) FROM stdin;
\.


--
-- Data for Name: party; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.party (party_id, type, name, tax_id, email, phone, user_id) FROM stdin;
11111111-1111-1111-1111-111111111111	SUPPLIER	Ali Pharma Distribution	\N	ali@pharma.com	03001234567	\N
22222222-2222-2222-2222-222222222222	CUSTOMER	Khyber Medical Store	\N	khyber@store.com	0915554433	\N
88044cfa-ed3a-4e89-aa3e-9d8e9178671b	CUSTOMER	Muhammad ZawarShah	\N	muhammadzawarshah7@gmail.com	Pstore	5
\.


--
-- Data for Name: payment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment (payment_id, payment_number, party_id, payment_date, payment_type, method, amount, reference_number, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: paymentallocation; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.paymentallocation (payment_allocation_id, payment_id, cust_inv_id, suppl_inv_id, allocated_amount, remarks) FROM stdin;
\.


--
-- Data for Name: product; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product (product_id, sku_code, name, description, product_cat_id, uom_id, hsn_code, brand) FROM stdin;
4a0010cf-329c-41f0-ae68-1d239ed3e9bd	\N	ioaciosmk	\N	1	1	\N	\N
\.


--
-- Data for Name: productcategory; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.productcategory (product_category_id, category, description) FROM stdin;
1	General Medicines	Daily use tablets and syrups
2	Surgical Items	Gauze, bandages, and surgical tools
3	Cosmetics	Skin care and beauty products
4	Injectables	Vials and ampoules
\.


--
-- Data for Name: productprice; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.productprice (prod_price_id, product_id, price_type, currency, uom_id, unit_price, effective_from, effective_to, tax_id) FROM stdin;
1	4a0010cf-329c-41f0-ae68-1d239ed3e9bd	RETAIL	pkr	1	50.0000	2026-02-01	\N	\N
\.


--
-- Data for Name: province; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.province (province_id, name) FROM stdin;
1	Khyber Pakhtunkhwa
2	Punjab
3	Sindh
4	Balochistan
\.


--
-- Data for Name: purchaseorder; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.purchaseorder (po_id, party_id_supplier, order_date, expected_del_date, status, total_amount) FROM stdin;
1	11111111-1111-1111-1111-111111111111	2026-01-27	\N	RECIEVED	0.00
\.


--
-- Data for Name: purchaseorderline; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.purchaseorderline (po_line_id, po_id, product_id, quantity, uom_id, unit_price, line_total, tax_id) FROM stdin;
1	1	4a0010cf-329c-41f0-ae68-1d239ed3e9bd	1500.0000	1	1500.0000	2250000.00	2
\.


--
-- Data for Name: salesorder; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.salesorder (so_id, party_id_customer, order_date, expected_del_date, status, total_amount) FROM stdin;
8	11111111-1111-1111-1111-111111111111	2026-01-27	\N	DRAFT	5000.00
10	88044cfa-ed3a-4e89-aa3e-9d8e9178671b	2026-02-01	\N	DRAFT	150.00
11	88044cfa-ed3a-4e89-aa3e-9d8e9178671b	2026-02-01	\N	DRAFT	350.00
13	88044cfa-ed3a-4e89-aa3e-9d8e9178671b	2026-02-01	\N	DRAFT	0.00
\.


--
-- Data for Name: salesorderline; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.salesorderline (so_line_id, so_id, product_id, quantity, uom_id, unit_price, line_total, tax_id) FROM stdin;
1	8	4a0010cf-329c-41f0-ae68-1d239ed3e9bd	1.0000	3	0.0000	0.00	\N
2	10	4a0010cf-329c-41f0-ae68-1d239ed3e9bd	3.0000	1	50.0000	150.00	\N
3	11	4a0010cf-329c-41f0-ae68-1d239ed3e9bd	4.0000	1	50.0000	200.00	\N
4	11	4a0010cf-329c-41f0-ae68-1d239ed3e9bd	3.0000	1	50.0000	150.00	\N
5	13	4a0010cf-329c-41f0-ae68-1d239ed3e9bd	1.0000	1	50.0000	50.00	\N
\.


--
-- Data for Name: stockitem; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stockitem (stock_item_id, product_id, warehouse_id, uom_id, quantity_on_hand, reorder_point, reserved_quantity) FROM stdin;
2	4a0010cf-329c-41f0-ae68-1d239ed3e9bd	1	1	1500.0000	\N	12.0000
\.


--
-- Data for Name: stockmovement; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stockmovement (stock_mov_id, mov_type, source_doctype, source_doc_id, product_id, warehouse_from_id, warehouse_to_id, quantity, uom_id, batch_id, posted_at) FROM stdin;
\.


--
-- Data for Name: supplierinvoice; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.supplierinvoice (suppl_inv_id, suppl_invoice_number, party_id, suppl_invoice_date, suppl_inv_due_date, amount_untaxed, tax_amount, total_amount, status, po_id) FROM stdin;
\.


--
-- Data for Name: supplierinvoiceline; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.supplierinvoiceline (suppl_inv_line_id, suppl_inv_id, product_id, quantity, unit_price, tax_id, line_total) FROM stdin;
\.


--
-- Data for Name: tax; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tax (tax_id, name, rate, type, context, gl_account_id) FROM stdin;
1	Standard GST	0.1800	PERCENTAGE	SALES_PURCHASE	\N
2	Reduced VAT	0.0500	PERCENTAGE	PURCHASE	\N
3	Zero Rated	0.0000	PERCENTAGE	EXEMPT	\N
\.


--
-- Data for Name: uom; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.uom (uom_id, name, conversion_to_base) FROM stdin;
1	Pieces	1.0000
2	Kilograms	1.0000
3	Box (10pcs)	10.0000
4	Liters	1.0000
\.


--
-- Data for Name: user; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."user" (user_id, username, email, password, role, is_active, created_at, updated_at) FROM stdin;
1	new_user_123	user@example.com	$2b$10$ghLxaLNVgnA9gSwr2pnIFuC0WY1IfrOq2iq1Ma6Y3XJxyE40IShQ6	ADMIN	t	2026-01-27 10:04:57.622-08	2026-01-27 10:04:57.622-08
3	new_dm_123	dm@example.com	$2b$10$/1SCgwvY4rWOlqZhjnqw6OxJK9ciGyUXjDyl08Qhersp/vIvMtqMK	WAREHOUSE_SUPPERVISOR	t	2026-01-28 14:43:08.952-08	2026-01-28 14:43:08.952-08
5	new_distributer_124	dmd@example.com	$2b$10$igVIPuCaTaN1BOaMN95QLeqoQOk22c0lMqHvEE0FxMfDcisqZUZRq	WAREHOUSE_CUSTOMER	t	2026-01-28 15:35:35.806-08	2026-02-02 06:49:30.69-08
6	zawarshahjknjk	gg@gmail.com	$2b$10$JlP.14s/hHbeDcJ2n8jWuuZVrIEs.0vS8Q0w4GVc/8IqX8AbPpEmu	WAREHOUSE_CUSTOMER	t	2026-02-02 07:00:48.482-08	2026-02-02 07:01:43.093-08
8	acountant	ac@example.com	123	ACCOUNTANT	t	2026-02-01 23:55:16.167928-08	2026-02-01 23:55:16.167928-08
10	new_distributer_123	acd@example.com	$2b$10$ns.6L8pM0eJhpXmI2QrpTuABXUOCrYZlWrK//F1GYlMpa9g0RFecy	ACCOUNTANT	t	2026-02-02 07:57:27.539-08	2026-02-02 07:57:27.539-08
\.


--
-- Data for Name: warehouse; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.warehouse (warehouse_id, name, location, type) FROM stdin;
3	Regional Distribution Center	2	Distribution
1	Main Central Stores	1	Main
\.


--
-- Name: batch_batch_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.batch_batch_id_seq', 4, true);


--
-- Name: customerinvoice_cust_inv_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.customerinvoice_cust_inv_id_seq', 1, false);


--
-- Name: customerinvoiceline_cust_inv_line_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.customerinvoiceline_cust_inv_line_id_seq', 1, false);


--
-- Name: deliverynote_delv_note_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.deliverynote_delv_note_id_seq', 1, false);


--
-- Name: deliverynoteline_delv_note_line_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.deliverynoteline_delv_note_line_id_seq', 1, false);


--
-- Name: grn_grn_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.grn_grn_id_seq', 11, true);


--
-- Name: grnline_grn_line_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.grnline_grn_line_id_seq', 4, true);


--
-- Name: journalentry_journal_entry_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.journalentry_journal_entry_id_seq', 1, false);


--
-- Name: journalline_journal_line_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.journalline_journal_line_id_seq', 1, false);


--
-- Name: payment_payment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payment_payment_id_seq', 1, false);


--
-- Name: paymentallocation_payment_allocation_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.paymentallocation_payment_allocation_id_seq', 1, false);


--
-- Name: purchaseorder_po_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.purchaseorder_po_id_seq', 1, true);


--
-- Name: purchaseorderline_po_line_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.purchaseorderline_po_line_id_seq', 1, true);


--
-- Name: salesorder_so_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.salesorder_so_id_seq', 13, true);


--
-- Name: salesorderline_so_line_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.salesorderline_so_line_id_seq', 5, true);


--
-- Name: stockitem_stock_item_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.stockitem_stock_item_id_seq', 2, true);


--
-- Name: stockmovement_stock_mov_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.stockmovement_stock_mov_id_seq', 1, false);


--
-- Name: user_user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_user_id_seq', 10, true);


--
-- Name: warehouse_warehouse_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.warehouse_warehouse_id_seq', 1, true);


--
-- Name: accountbalance accountbalance_gl_account_id_period_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accountbalance
    ADD CONSTRAINT accountbalance_gl_account_id_period_key UNIQUE (gl_account_id, period);


--
-- Name: accountbalance accountbalance_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accountbalance
    ADD CONSTRAINT accountbalance_pkey PRIMARY KEY (acc_bal_id);


--
-- Name: addresses addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_pkey PRIMARY KEY (address_id);


--
-- Name: batch batch_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.batch
    ADD CONSTRAINT batch_pkey PRIMARY KEY (batch_id);


--
-- Name: customerinvoice customerinvoice_cust_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customerinvoice
    ADD CONSTRAINT customerinvoice_cust_invoice_number_key UNIQUE (cust_invoice_number);


--
-- Name: customerinvoice customerinvoice_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customerinvoice
    ADD CONSTRAINT customerinvoice_pkey PRIMARY KEY (cust_inv_id);


--
-- Name: customerinvoiceline customerinvoiceline_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customerinvoiceline
    ADD CONSTRAINT customerinvoiceline_pkey PRIMARY KEY (cust_inv_line_id);


--
-- Name: deliverynote deliverynote_delivery_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deliverynote
    ADD CONSTRAINT deliverynote_delivery_number_key UNIQUE (delivery_number);


--
-- Name: deliverynote deliverynote_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deliverynote
    ADD CONSTRAINT deliverynote_pkey PRIMARY KEY (delv_note_id);


--
-- Name: deliverynoteline deliverynoteline_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deliverynoteline
    ADD CONSTRAINT deliverynoteline_pkey PRIMARY KEY (delv_note_line_id);


--
-- Name: glaccount glaccount_gl_account_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.glaccount
    ADD CONSTRAINT glaccount_gl_account_code_key UNIQUE (gl_account_code);


--
-- Name: glaccount glaccount_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.glaccount
    ADD CONSTRAINT glaccount_pkey PRIMARY KEY (gl_account_id);


--
-- Name: grn grn_grn_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grn
    ADD CONSTRAINT grn_grn_number_key UNIQUE (grn_number);


--
-- Name: grn grn_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grn
    ADD CONSTRAINT grn_pkey PRIMARY KEY (grn_id);


--
-- Name: grnline grnline_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grnline
    ADD CONSTRAINT grnline_pkey PRIMARY KEY (grn_line_id);


--
-- Name: journalentry journalentry_journal_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.journalentry
    ADD CONSTRAINT journalentry_journal_number_key UNIQUE (journal_number);


--
-- Name: journalentry journalentry_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.journalentry
    ADD CONSTRAINT journalentry_pkey PRIMARY KEY (journal_entry_id);


--
-- Name: journalline journalline_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.journalline
    ADD CONSTRAINT journalline_pkey PRIMARY KEY (journal_line_id);


--
-- Name: party party_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.party
    ADD CONSTRAINT party_pkey PRIMARY KEY (party_id);


--
-- Name: payment payment_payment_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment
    ADD CONSTRAINT payment_payment_number_key UNIQUE (payment_number);


--
-- Name: payment payment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment
    ADD CONSTRAINT payment_pkey PRIMARY KEY (payment_id);


--
-- Name: paymentallocation paymentallocation_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.paymentallocation
    ADD CONSTRAINT paymentallocation_pkey PRIMARY KEY (payment_allocation_id);


--
-- Name: product product_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product
    ADD CONSTRAINT product_pkey PRIMARY KEY (product_id);


--
-- Name: product product_sku_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product
    ADD CONSTRAINT product_sku_code_key UNIQUE (sku_code);


--
-- Name: productcategory productcategory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.productcategory
    ADD CONSTRAINT productcategory_pkey PRIMARY KEY (product_category_id);


--
-- Name: productprice productprice_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.productprice
    ADD CONSTRAINT productprice_pkey PRIMARY KEY (prod_price_id);


--
-- Name: province province_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.province
    ADD CONSTRAINT province_pkey PRIMARY KEY (province_id);


--
-- Name: purchaseorder purchaseorder_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchaseorder
    ADD CONSTRAINT purchaseorder_pkey PRIMARY KEY (po_id);


--
-- Name: purchaseorderline purchaseorderline_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchaseorderline
    ADD CONSTRAINT purchaseorderline_pkey PRIMARY KEY (po_line_id);


--
-- Name: salesorder salesorder_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salesorder
    ADD CONSTRAINT salesorder_pkey PRIMARY KEY (so_id);


--
-- Name: salesorderline salesorderline_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salesorderline
    ADD CONSTRAINT salesorderline_pkey PRIMARY KEY (so_line_id);


--
-- Name: stockitem stockitem_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stockitem
    ADD CONSTRAINT stockitem_pkey PRIMARY KEY (stock_item_id);


--
-- Name: stockitem stockitem_product_id_warehouse_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stockitem
    ADD CONSTRAINT stockitem_product_id_warehouse_id_key UNIQUE (product_id, warehouse_id);


--
-- Name: stockmovement stockmovement_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stockmovement
    ADD CONSTRAINT stockmovement_pkey PRIMARY KEY (stock_mov_id);


--
-- Name: supplierinvoice supplierinvoice_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplierinvoice
    ADD CONSTRAINT supplierinvoice_pkey PRIMARY KEY (suppl_inv_id);


--
-- Name: supplierinvoice supplierinvoice_suppl_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplierinvoice
    ADD CONSTRAINT supplierinvoice_suppl_invoice_number_key UNIQUE (suppl_invoice_number);


--
-- Name: supplierinvoiceline supplierinvoiceline_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplierinvoiceline
    ADD CONSTRAINT supplierinvoiceline_pkey PRIMARY KEY (suppl_inv_line_id);


--
-- Name: tax tax_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tax
    ADD CONSTRAINT tax_pkey PRIMARY KEY (tax_id);


--
-- Name: uom uom_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.uom
    ADD CONSTRAINT uom_name_key UNIQUE (name);


--
-- Name: uom uom_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.uom
    ADD CONSTRAINT uom_pkey PRIMARY KEY (uom_id);


--
-- Name: user user_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (user_id);


--
-- Name: warehouse warehouse_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouse
    ADD CONSTRAINT warehouse_pkey PRIMARY KEY (warehouse_id);


--
-- Name: user_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX user_email_key ON public."user" USING btree (email);


--
-- Name: user_username_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX user_username_key ON public."user" USING btree (username);


--
-- Name: accountbalance accountbalance_gl_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accountbalance
    ADD CONSTRAINT accountbalance_gl_account_id_fkey FOREIGN KEY (gl_account_id) REFERENCES public.glaccount(gl_account_id);


--
-- Name: addresses addresses_party_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_party_id_fkey FOREIGN KEY (party_id) REFERENCES public.party(party_id);


--
-- Name: batch batch_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.batch
    ADD CONSTRAINT batch_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.province(province_id);


--
-- Name: batch batch_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.batch
    ADD CONSTRAINT batch_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(product_id);


--
-- Name: customerinvoice customerinvoice_party_id_customer_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customerinvoice
    ADD CONSTRAINT customerinvoice_party_id_customer_fkey FOREIGN KEY (party_id_customer) REFERENCES public.party(party_id);


--
-- Name: customerinvoice customerinvoice_so_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customerinvoice
    ADD CONSTRAINT customerinvoice_so_id_fkey FOREIGN KEY (so_id) REFERENCES public.salesorder(so_id);


--
-- Name: customerinvoiceline customerinvoiceline_cust_inv_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customerinvoiceline
    ADD CONSTRAINT customerinvoiceline_cust_inv_id_fkey FOREIGN KEY (cust_inv_id) REFERENCES public.customerinvoice(cust_inv_id);


--
-- Name: customerinvoiceline customerinvoiceline_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customerinvoiceline
    ADD CONSTRAINT customerinvoiceline_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(product_id);


--
-- Name: customerinvoiceline customerinvoiceline_tax_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customerinvoiceline
    ADD CONSTRAINT customerinvoiceline_tax_id_fkey FOREIGN KEY (tax_id) REFERENCES public.tax(tax_id);


--
-- Name: deliverynote deliverynote_so_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deliverynote
    ADD CONSTRAINT deliverynote_so_id_fkey FOREIGN KEY (so_id) REFERENCES public.salesorder(so_id);


--
-- Name: deliverynoteline deliverynoteline_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deliverynoteline
    ADD CONSTRAINT deliverynoteline_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.batch(batch_id);


--
-- Name: deliverynoteline deliverynoteline_delv_note_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deliverynoteline
    ADD CONSTRAINT deliverynoteline_delv_note_id_fkey FOREIGN KEY (delv_note_id) REFERENCES public.deliverynote(delv_note_id);


--
-- Name: deliverynoteline deliverynoteline_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deliverynoteline
    ADD CONSTRAINT deliverynoteline_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(product_id);


--
-- Name: deliverynoteline deliverynoteline_so_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deliverynoteline
    ADD CONSTRAINT deliverynoteline_so_line_id_fkey FOREIGN KEY (so_line_id) REFERENCES public.salesorderline(so_line_id);


--
-- Name: deliverynoteline deliverynoteline_uom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deliverynoteline
    ADD CONSTRAINT deliverynoteline_uom_id_fkey FOREIGN KEY (uom_id) REFERENCES public.uom(uom_id);


--
-- Name: party fk_party_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.party
    ADD CONSTRAINT fk_party_user FOREIGN KEY (user_id) REFERENCES public."user"(user_id);


--
-- Name: glaccount glaccount_parent_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.glaccount
    ADD CONSTRAINT glaccount_parent_account_id_fkey FOREIGN KEY (parent_account_id) REFERENCES public.glaccount(gl_account_id);


--
-- Name: grn grn_po_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grn
    ADD CONSTRAINT grn_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.purchaseorder(po_id);


--
-- Name: grnline grnline_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grnline
    ADD CONSTRAINT grnline_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.batch(batch_id);


--
-- Name: grnline grnline_grn_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grnline
    ADD CONSTRAINT grnline_grn_id_fkey FOREIGN KEY (grn_id) REFERENCES public.grn(grn_id);


--
-- Name: grnline grnline_po_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grnline
    ADD CONSTRAINT grnline_po_line_id_fkey FOREIGN KEY (po_line_id) REFERENCES public.purchaseorderline(po_line_id);


--
-- Name: grnline grnline_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grnline
    ADD CONSTRAINT grnline_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(product_id);


--
-- Name: grnline grnline_uom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grnline
    ADD CONSTRAINT grnline_uom_id_fkey FOREIGN KEY (uom_id) REFERENCES public.uom(uom_id);


--
-- Name: journalline journalline_gl_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.journalline
    ADD CONSTRAINT journalline_gl_account_id_fkey FOREIGN KEY (gl_account_id) REFERENCES public.glaccount(gl_account_id);


--
-- Name: journalline journalline_journal_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.journalline
    ADD CONSTRAINT journalline_journal_entry_id_fkey FOREIGN KEY (journal_entry_id) REFERENCES public.journalentry(journal_entry_id);


--
-- Name: journalline journalline_party_id_sub_ledger_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.journalline
    ADD CONSTRAINT journalline_party_id_sub_ledger_fkey FOREIGN KEY (party_id_sub_ledger) REFERENCES public.party(party_id);


--
-- Name: party party_tax_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.party
    ADD CONSTRAINT party_tax_id_fkey FOREIGN KEY (tax_id) REFERENCES public.tax(tax_id);


--
-- Name: payment payment_party_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment
    ADD CONSTRAINT payment_party_id_fkey FOREIGN KEY (party_id) REFERENCES public.party(party_id);


--
-- Name: paymentallocation paymentallocation_cust_inv_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.paymentallocation
    ADD CONSTRAINT paymentallocation_cust_inv_id_fkey FOREIGN KEY (cust_inv_id) REFERENCES public.customerinvoice(cust_inv_id);


--
-- Name: paymentallocation paymentallocation_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.paymentallocation
    ADD CONSTRAINT paymentallocation_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payment(payment_id);


--
-- Name: paymentallocation paymentallocation_suppl_inv_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.paymentallocation
    ADD CONSTRAINT paymentallocation_suppl_inv_id_fkey FOREIGN KEY (suppl_inv_id) REFERENCES public.supplierinvoice(suppl_inv_id);


--
-- Name: product product_product_cat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product
    ADD CONSTRAINT product_product_cat_id_fkey FOREIGN KEY (product_cat_id) REFERENCES public.productcategory(product_category_id);


--
-- Name: product product_uom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product
    ADD CONSTRAINT product_uom_id_fkey FOREIGN KEY (uom_id) REFERENCES public.uom(uom_id);


--
-- Name: productprice productprice_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.productprice
    ADD CONSTRAINT productprice_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(product_id);


--
-- Name: productprice productprice_tax_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.productprice
    ADD CONSTRAINT productprice_tax_id_fkey FOREIGN KEY (tax_id) REFERENCES public.tax(tax_id);


--
-- Name: productprice productprice_uom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.productprice
    ADD CONSTRAINT productprice_uom_id_fkey FOREIGN KEY (uom_id) REFERENCES public.uom(uom_id);


--
-- Name: purchaseorder purchaseorder_party_id_supplier_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchaseorder
    ADD CONSTRAINT purchaseorder_party_id_supplier_fkey FOREIGN KEY (party_id_supplier) REFERENCES public.party(party_id);


--
-- Name: purchaseorderline purchaseorderline_po_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchaseorderline
    ADD CONSTRAINT purchaseorderline_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.purchaseorder(po_id);


--
-- Name: purchaseorderline purchaseorderline_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchaseorderline
    ADD CONSTRAINT purchaseorderline_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(product_id);


--
-- Name: purchaseorderline purchaseorderline_tax_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchaseorderline
    ADD CONSTRAINT purchaseorderline_tax_id_fkey FOREIGN KEY (tax_id) REFERENCES public.tax(tax_id);


--
-- Name: purchaseorderline purchaseorderline_uom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchaseorderline
    ADD CONSTRAINT purchaseorderline_uom_id_fkey FOREIGN KEY (uom_id) REFERENCES public.uom(uom_id);


--
-- Name: salesorder salesorder_party_id_customer_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salesorder
    ADD CONSTRAINT salesorder_party_id_customer_fkey FOREIGN KEY (party_id_customer) REFERENCES public.party(party_id);


--
-- Name: salesorderline salesorderline_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salesorderline
    ADD CONSTRAINT salesorderline_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(product_id);


--
-- Name: salesorderline salesorderline_so_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salesorderline
    ADD CONSTRAINT salesorderline_so_id_fkey FOREIGN KEY (so_id) REFERENCES public.salesorder(so_id);


--
-- Name: salesorderline salesorderline_tax_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salesorderline
    ADD CONSTRAINT salesorderline_tax_id_fkey FOREIGN KEY (tax_id) REFERENCES public.tax(tax_id);


--
-- Name: salesorderline salesorderline_uom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salesorderline
    ADD CONSTRAINT salesorderline_uom_id_fkey FOREIGN KEY (uom_id) REFERENCES public.uom(uom_id);


--
-- Name: stockitem stockitem_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stockitem
    ADD CONSTRAINT stockitem_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(product_id);


--
-- Name: stockitem stockitem_uom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stockitem
    ADD CONSTRAINT stockitem_uom_id_fkey FOREIGN KEY (uom_id) REFERENCES public.uom(uom_id);


--
-- Name: stockitem stockitem_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stockitem
    ADD CONSTRAINT stockitem_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouse(warehouse_id);


--
-- Name: stockmovement stockmovement_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stockmovement
    ADD CONSTRAINT stockmovement_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.batch(batch_id);


--
-- Name: stockmovement stockmovement_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stockmovement
    ADD CONSTRAINT stockmovement_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(product_id);


--
-- Name: stockmovement stockmovement_uom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stockmovement
    ADD CONSTRAINT stockmovement_uom_id_fkey FOREIGN KEY (uom_id) REFERENCES public.uom(uom_id);


--
-- Name: stockmovement stockmovement_warehouse_from_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stockmovement
    ADD CONSTRAINT stockmovement_warehouse_from_id_fkey FOREIGN KEY (warehouse_from_id) REFERENCES public.warehouse(warehouse_id);


--
-- Name: stockmovement stockmovement_warehouse_to_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stockmovement
    ADD CONSTRAINT stockmovement_warehouse_to_id_fkey FOREIGN KEY (warehouse_to_id) REFERENCES public.warehouse(warehouse_id);


--
-- Name: supplierinvoice supplierinvoice_party_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplierinvoice
    ADD CONSTRAINT supplierinvoice_party_id_fkey FOREIGN KEY (party_id) REFERENCES public.party(party_id);


--
-- Name: supplierinvoice supplierinvoice_po_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplierinvoice
    ADD CONSTRAINT supplierinvoice_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.purchaseorder(po_id);


--
-- Name: supplierinvoiceline supplierinvoiceline_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplierinvoiceline
    ADD CONSTRAINT supplierinvoiceline_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(product_id);


--
-- Name: supplierinvoiceline supplierinvoiceline_suppl_inv_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplierinvoiceline
    ADD CONSTRAINT supplierinvoiceline_suppl_inv_id_fkey FOREIGN KEY (suppl_inv_id) REFERENCES public.supplierinvoice(suppl_inv_id);


--
-- Name: supplierinvoiceline supplierinvoiceline_tax_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplierinvoiceline
    ADD CONSTRAINT supplierinvoiceline_tax_id_fkey FOREIGN KEY (tax_id) REFERENCES public.tax(tax_id);


--
-- Name: tax tax_gl_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tax
    ADD CONSTRAINT tax_gl_account_id_fkey FOREIGN KEY (gl_account_id) REFERENCES public.glaccount(gl_account_id);


--
-- Name: warehouse warehouse_location_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouse
    ADD CONSTRAINT warehouse_location_fkey FOREIGN KEY (location) REFERENCES public.province(province_id);


--
-- PostgreSQL database dump complete
--

