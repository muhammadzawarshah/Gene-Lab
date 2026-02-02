import { journal_type_enum } from "../generated/prisma/enums";
import { prisma } from "../lib/prisma";

interface journalentry {
    journal_entry_id : number;
    journal_number   : string;
    journal_type     : journal_type_enum;
    date             : Date;
    narration        : string;
    posted_by        : string;
    posted_at        : Date;
    source_type      : string;
    source_id        : number;
    journalline      : Array<any>;
}

class JournalentryModel {
    async create(data: Omit<journalentry, 'journal_entry_id' | 'journalline'>): Promise<journalentry> {
        return prisma.journalentry.create({ data });
    }
    async findById(journal_entry_id: number): Promise<journalentry | null> {
        return prisma.journalentry.findUnique({
            where: { journal_entry_id },
            include: { journalline: true }
        });
    }
    async update(journal_entry_id: number, data: Partial<Omit<journalentry, 'journal_entry_id' | 'journalline'>>): Promise<journalentry> {
        return prisma.journalentry.update({
            where: { journal_entry_id },
            data
        });
    }
    async delete(journal_entry_id: number): Promise<journalentry> {
        return prisma.journalentry.delete({
            where: { journal_entry_id }
        });
    }
    async findAll(): Promise<journalentry[]> {
        return prisma.journalentry.findMany({
            include: { journalline: true }
        });
    }
}

export default  JournalentryModel;