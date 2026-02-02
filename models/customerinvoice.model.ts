import { Decimal } from "@prisma/client/runtime/client";
import { prisma } from "../lib/prisma";

interface CustomerInvoice {
    cust_inv_id: number | undefined,
    cust_invoice_number : string,
    party_id_customer : string,
    cust_invoice_date : Date,
    cust_inv_due_date : Date,
    total_amount      : Decimal,
    status            : string,
    so_id             : number,
    party             : string,
    salesorder        : string,
    customerinvoiceline : Array<any>,
    paymentallocation   : Array<any>
}

class CustomerInvoiceModel{
    static async getCustomerInvoice(custInvId: number) {
        const customerInvoice = prisma.customerinvoice.findUnique({
            where: { cust_inv_id: custInvId },
        });
        return customerInvoice;
    }
    static async createCustomerInvoice(data: CustomerInvoice) {
        const newCustomerInvoice = await prisma.customerinvoice.create({
            data: {
                cust_inv_id: data.cust_inv_id,
                cust_invoice_number : data.cust_invoice_number,
                party_id_customer : data.party_id_customer,
                cust_invoice_date : data.cust_invoice_date,
                cust_inv_due_date : data.cust_inv_due_date,
                total_amount      : data.total_amount,
                status            : data.status,
                so_id             : data.so_id,
                party             : data.party,
                salesorder        : data.salesorder,
                customerinvoiceline : {connect: data.customerinvoiceline},
                paymentallocation   : {connect: data.paymentallocation}
                },
        });
        return newCustomerInvoice;
    }
    static async updateCustomerInvoice(custInvId: number, data: Partial<CustomerInvoice>) {
        const updatedCustomerInvoice = await prisma.customerinvoice.update({
            where: { cust_inv_id: custInvId },
            data: {
                ...data,
            },
        });
        return updatedCustomerInvoice;
    }
    static async deleteCustomerInvoice(custInvId: number) {
        const deletedCustomerInvoice = await prisma.customerinvoice.delete({
            where: { cust_inv_id: custInvId },
        });
        return deletedCustomerInvoice;
    }
}
export default CustomerInvoiceModel;