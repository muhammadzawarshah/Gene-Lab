"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Printer, X } from "lucide-react";

interface LedgerStatementModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  onDownloadPdf: () => void;
  onPrint: () => void;
  children: React.ReactNode;
}

export const LedgerStatementModal = ({
  isOpen,
  title,
  onClose,
  onDownloadPdf,
  onPrint,
  children,
}: LedgerStatementModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, y: 18 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 18 }}
            onClick={(event) => event.stopPropagation()}
            className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#0f172a] shadow-2xl"
          >
            <div className="flex flex-col gap-4 border-b border-white/5 bg-white/[0.02] px-6 py-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.28em] text-slate-500">
                  Ledger Report Preview
                </p>
                <h2 className="mt-1 text-lg font-black uppercase tracking-tight text-white italic">
                  {title}
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={onDownloadPdf}
                  className="flex items-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 transition-all hover:bg-blue-500 hover:text-white"
                >
                  <Download size={14} /> PDF
                </button>
                <button
                  onClick={onPrint}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 transition-all hover:bg-white/10 hover:text-white"
                >
                  <Printer size={14} /> Print
                </button>
                <button
                  onClick={onClose}
                  className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 transition-all hover:bg-white/10 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="custom-scrollbar flex-1 overflow-y-auto bg-slate-200 p-4 md:p-8">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
