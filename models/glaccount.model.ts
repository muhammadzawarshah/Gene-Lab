import { prisma } from "../lib/prisma";

interface glaccountData {
    gl_account_id     : number;
    gl_account_code   : string;
    parent_account_id : number | undefined;
    name              : string;
    type              : string;
    is_control_account: boolean | undefined;
    controled_by      : string | undefined;
    accountbalance    : Array<any>;
    glaccount          : any;
    other_glaccount    : any[];
    journalline        : any[];
    tax                : any[];
}

class GlaccountModel {
    async create(data: glaccountData) {
        return await prisma.glaccount.create({
            data,
        });
    }

    async findAll() {
        return await prisma.glaccount.findMany({
            include: {
                accountbalance: true,
                glaccount: true,
                other_glaccount: true,
                journalline: true,
                tax: true,
            },
        });
    }
    async findOne(gl_account_id: number) {
        return await prisma.glaccount.findUnique({
            where: { gl_account_id },
            include: {
                accountbalance: true,
                glaccount: true,
                other_glaccount: true,
                journalline: true,
                tax: true,
            },
        });
    }
    async update(gl_account_id: number, data: Partial<glaccountData>) {
        return await prisma.glaccount.update({
            where: { gl_account_id },
            data,
        });
    }
    async delete(gl_account_id: number) {
        return await prisma.glaccount.delete({
            where: { gl_account_id },
        });
    }
}


export default glaccountData;