import {
    LayoutDashboard, ShoppingBag, Truck, FileText,
    Warehouse, Users, Settings, PlusCircle,
    ClipboardList, CreditCard, LucideIcon,
    ArrowDownLeft, ArrowUpRight, BookOpen,
    Landmark, Banknote, History, FileSearch,
    UserCircle, Wallet, KeyRound
} from 'lucide-react';

// --- Types & Interfaces ---
export interface SubItem {
    label: string;
    href: string;
}

export interface DropdownItem {
    id?: string;
    label: string;
    href?: string;
    type?: 'nested';
    subItems?: SubItem[];
}

export interface MenuItem {
    id: string;
    title?: string;
    label?: string;
    icon: LucideIcon;
    type: 'link' | 'dropdown';
    href?: string;
    items?: DropdownItem[];
}

// --- Navigation Configuration ---
export const NAVIGATION_CONFIG: Record<string, MenuItem[]> = {

    // 1. Role: Distributor Manager
    WAREHOUSE_SUPPERVISOR: [
        {
            id: 'dashboard',
            icon: LayoutDashboard,
            label: 'Dashboard',
            href: '/distributorManager',
            type: 'link'
        },
        {
            id: 'Tax',
            icon: LayoutDashboard,
            label: 'Tax',
            href: '/distributorManager/Tax',
            type: 'link'
        },
        {
            id: 'Category',
            icon: LayoutDashboard,
            label: 'Category',
            href: '/distributorManager/Category',
            type: 'link'
        },
        {
            id: 'Product',
            title: 'Product',
            icon: ShoppingBag,
            type: 'dropdown',
            items: [
                { label: 'Create Product', href: '/distributorManager/Products/CreateProduct' },
                { label: 'Product List', href: '/distributorManager/Products/ProductList' },
                { label: 'Product Prices', href: '/distributorManager/ProductPrices' },
            ]
        },
        {
            id: 'purchase_orders',
            title: 'Purchase Orders',
            icon: ShoppingBag,
            type: 'dropdown',
            items: [
                { label: 'Create Purchase Order', href: '/distributorManager/Purchase/CreatePurchaseOrder' },
                { label: 'Purchase Order', href: '/distributorManager/Purchase/PurchaseList' },
                // Purchase from 
                // Purchase to  
            ]
        },
        {
            id: 'sales',
            title: 'Sales Orders',
            icon: ShoppingBag,
            type: 'dropdown',
            items: [
                { label: 'Create Sales Order', href: '/distributorManager/SalesOrders/CreateSalesOrder' },
                { label: 'Pending Approval', href: '/distributorManager/SalesOrders/PendingApproval' },
                { label: 'Approved Orders', href: '/distributorManager/SalesOrders/ApprovedOrders' },
                { label: 'Rejected Orders', href: '/distributorManager/SalesOrders/RejectedOrders' },
            ]
        },
        {
            id: 'GRN',
            title: 'GRN',
            icon: ShoppingBag,
            type: 'dropdown',
            items: [
                { label: 'New GRN', href: '/distributorManager/GRN/NewGRN' },
                { label: 'List GRN', href: '/distributorManager/GRN/ListGRN' },
            ]
        },
        {
            id: 'deliveries',
            title: 'Deliveries',
            icon: Truck,
            type: 'dropdown',
            items: [
                { label: 'Create Delivery Note', href: '/distributorManager/Deliveries/CreateDeliveryNote' },
                { label: 'Pending Delivery', href: '/distributorManager/Deliveries/PendingDelivery' },
                { label: 'Completed', href: '/distributorManager/Deliveries/Completed' },
            ]
        },
        {
            id: 'finance',
            title: 'Invoices',
            icon: FileText,
            type: 'dropdown',
            items: [
                { label: 'Purchase Invoice', href: '/distributorManager/Invoices/PurchaseInvoice' },
                { label: 'Sale Invoice', href: '/distributorManager/Invoices/SaleInvoice' },
            ]
        },
        {
            id: 'warehouse_root',
            title: 'Inventory / Warehouse',
            icon: Warehouse,
            type: 'dropdown',
            items: [
                {
                    label: 'Warehouses',
                    type: 'nested',
                    id: 'nested_warehouse',
                    subItems: [
                        { label: 'Create Warehouse', href: '/distributorManager/Inventory/Warehouses/CreateWarehouse' },
                        { label: 'Warehouse List', href: '/distributorManager/Inventory/Warehouses/WarehouseList' },
                    ]
                },
                { label: 'Stock Ledger', href: '/distributorManager/Inventory/Ledger' },
                { label: 'Batch & Expiry', href: '/distributorManager/Inventory/Batch&ExpiryManagement' },
                { label: 'Stock Transfer', href: '/distributorManager/Inventory/StockTransferBetweenWarehouses' },
            ]
        },
        {
            id: 'distributors',
            title: 'Distributors',
            icon: Users,
            type: 'dropdown',
            items: [
                { label: 'Distributor List', href: '/distributorManager/Distributors/DistributorList' },
                // { label: 'Credit Status', href: '/distributorManager/Distributors/CreditStatus' },
            ]
        },
        {
            id: 'control',
            title: 'System Control',
            icon: Settings,
            type: 'dropdown',
            items: [
                { label: 'Reports', href: '/distributorManager/Reports' },
                { label: 'Profile / Settings', href: '/distributorManager/Profile' },
            ]
        }
    ],

    // 2. Role: Distributor Dashboard
    WAREHOUSE_CUSTOMER: [
        {
            id: 'dist_dash',
            icon: LayoutDashboard,
            label: 'Dashboard',
            type: 'dropdown',
            items: [
                { label: 'Overview', href: '/distributorDashboard' },
                { label: 'Outstanding Balance', href: '/distributorDashboard/Overview/Balance' },
                { label: 'Recent POs', href: '/distributorDashboard/Overview/RecentPOs' },
                { label: 'Invoice Status', href: '/distributorDashboard/Overview/InvoiceStatus' },
            ]
        },
        {
            id: 'create_po',
            icon: PlusCircle,
            label: 'Create PO',
            href: '/distributorDashboard/CreatePO',
            type: 'link'
        },
        {
            id: 'my_orders',
            icon: ClipboardList,
            label: 'My Orders',
            href: '/distributorDashboard/MyOrders',
            type: 'link'
        },
        {
            id: 'invoices',
            icon: FileText,
            label: 'Invoices',
            href: '/distributorDashboard/Invoices',
            type: 'link'
        },
        {
            id: 'payments',
            icon: CreditCard,
            label: 'Payments',
            href: '/distributorDashboard/Payments',
            type: 'link'
        },
        // {
        //     id: 'settings',
        //     icon: Settings,
        //     label: 'Settings',
        //     type: 'dropdown',
        //     items: [
        //         { label: 'Account Info', href: '/distributorDashboard/Profile' },
        //         { label: 'Change Password', href: '/distributorDashboard/ChangePassword' },
        //     ]
        // }
    ],

    // 3. Role: Accounts Dashboard (NEW)
    ACCOUNTANT: [
        {
            id: 'acc_overview',
            icon: LayoutDashboard,
            label: 'Dashboard',
            type: 'dropdown',
            items: [
                { label: 'Overview', href: '/accountsDashboard/Dashboard/Overview' },
                { label: 'Total Receivables', href: '/accountsDashboard/Dashboard/TotalReceivables' },
                { label: 'Pending Payments', href: '/accountsDashboard/Dashboard/PendingPayments' },
                { label: 'Recent Payments', href: '/accountsDashboard/Dashboard/RecentPayments' },
            ]
        },
        {
            id: 'payments_in',
            icon: ArrowDownLeft,
            label: 'Payment in',
            type: 'dropdown',
            items: [
                { label: 'Create sale Payment', href: '/accountsDashboard/PaymentsIn/CreatePayment' },
                { label: 'sale List', href: '/accountsDashboard/PaymentsIn/PaymentHistory' },
            ]
        },
        {
            id: 'payments_out',
            icon: ArrowUpRight,
            label: 'payment out',
            type: 'dropdown',
            items: [
                { label: 'Create purchase payment', href: '/accountsDashboard/PaymentsOut/CreatePayment' },
                { label: 'purchase list', href: '/accountsDashboard/PaymentsOut/PaymentHistory' },
            ]
        },
        {
            id: 'acc_invoices',
            icon: FileSearch,
            label: 'Invoices (View Only)',
            type: 'dropdown',
            items: [
                { label: 'Sales Invoices', href: '/accountsDashboard/Invoices/SalesInvoices' },
                { label: 'Purchase Invoices', href: '/accountsDashboard/Invoices/PurchaseInvoices' },
            ]
        },
        {
            id: 'ledgers',
            icon: BookOpen,
            label: 'Accounts / Ledgers',
            type: 'dropdown',
            items: [
                { label: 'General Ledger',    href: '/accountsDashboard/Accounts/GeneralLedger' },
                { label: 'Trial Balance',     href: '/accountsDashboard/Accounts/AccountBalance' },
                { label: 'Customer Ledger',   href: '/accountsDashboard/Accounts/CustomerLedger' },
                { label: 'Vendor Ledger',     href: '/accountsDashboard/Accounts/VendorLedger' },
                { label: 'Bank / Cash Ledger',href: '/accountsDashboard/Accounts/Bank' },
            ]
        },
        {
            id: 'bank_cash',
            icon: Landmark,
            label: 'Bank / Cash',
            type: 'dropdown',
            items: [
                { label: 'Balances',            href: '/accountsDashboard/CashAccounts' },
                { label: 'Payment Allocations', href: '/accountsDashboard/Accounts/PaymentAllocation' },
            ]
        },
        {
            id: 'acc_settings',
            icon: Settings,
            label: 'Profile / Settings',
            type: 'dropdown',
            items: [
                { label: 'Account Info', href: '/accountsDashboard/ProfileSetting/AccountInfo' },
                { label: 'Change Password', href: '/accountsDashboard/ProfileSetting/ChangePassword' },
            ]
        }
    ]
};