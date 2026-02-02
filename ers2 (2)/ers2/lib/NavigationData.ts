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
            id: 'sales',
            title: 'Sales Orders',
            icon: ShoppingBag,
            type: 'dropdown',
            items: [
                { label: 'Pending Approval', href: '/distributorManager/SalesOrders/PendingApproval' },
                { label: 'Approved Orders', href: '/distributorManager/SalesOrders/ApprovedOrders' },
                { label: 'Rejected Orders', href: '/distributorManager/SalesOrders/RejectedOrders' },
                { label: 'Create Sales Order', href: '/distributorManager/SalesOrders/CreateSalesOrder' },
            ]
        },
        {
            id: 'deliveries',
            title: 'Deliveries',
            icon: Truck,
            type: 'dropdown',
            items: [
                { label: 'Pending Delivery', href: '/distributorManager/Deliveries/PendingDelivery' },
                { label: 'Completed', href: '/distributorManager/Deliveries/Completed' },
                { label: 'Create Delivery Note', href: '/distributorManager/Deliveries/CreateDeliveryNote' },
            ]
        },
        {
            id: 'finance',
            title: 'Invoices',
            icon: FileText,
            type: 'dropdown',
            items: [
                { label: 'Payment Status', href: '/distributorManager/Invoices/PaymentStatus' },
                { label: 'Create Invoice', href: '/distributorManager/Invoices/CreateInvoice' },
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
                        { label: 'View / Edit Warehouse', href: '/distributorManager/Inventory/Warehouses/EditWarehouse' },
                        { label: 'Warehouse List', href: '/distributorManager/Inventory/Warehouses/WarehouseList' },
                    ]
                },
                { label: 'Stock Ledger', href: '/distributorManager/Inventory/Ledger' },
                { label: 'Add Stock (GRN)', href: '/distributorManager/Inventory/AddStock' },
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
                // { label: 'Reports', href: '/distributorManager/Reports' },
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
            label: 'Payments In (Customer)',
            type: 'dropdown',
            items: [
                { label: 'Create Payment', href: '/accountsDashboard/Payments/CreatePayment' },
                { label: 'Pending Payments', href: '/accountsDashboard/Payments/PendingPayments' },
                { label: 'Payment History', href: '/accountsDashboard/Payments/PaymentHistory' },
            ]
        },
        {
            id: 'payments_out',
            icon: ArrowUpRight,
            label: 'Payments Out (Vendor)',
            type: 'dropdown',
            items: [
                { label: 'Create Payment', href: '/accountsDashboard/PaymentsOut/CreatePayment' },
                { label: 'Pending Payments', href: '/accountsDashboard/PaymentsOut/PendingPayments' },
                { label: 'Payment History', href: '/accountsDashboard/PaymentsOut/PaymentHistory' },
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
                { label: 'Customer Ledger', href: '/accountsDashboard/Accounts/CustomerLedger' },
                { label: 'Bank / Cash Ledger', href: '/accountsDashboard/Accounts/Bank' },
                { label: 'Vendor Ledger', href: '/accountsDashboard/Accounts/VendorLedger' },
            ]
        },
        {
            id: 'bank_cash',
            icon: Landmark,
            label: 'Bank / Cash',
            type: 'dropdown',
            items: [
                { label: 'Balances', href: '/accountsDashboard/CashAccounts' },
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