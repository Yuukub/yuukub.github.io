import { PDFDocument } from "pdf-lib";

self.onmessage = async (e: MessageEvent) => {
    const { type, id } = e.data;

    try {
        if (type === "merge") {
            const { buffers } = e.data as { buffers: ArrayBuffer[]; id: string };
            self.postMessage({ type: "progress", id, message: "กำลังรวมไฟล์ PDF..." });

            const merged = await PDFDocument.create();
            for (let i = 0; i < buffers.length; i++) {
                self.postMessage({ type: "progress", id, message: `กำลังประมวลผลไฟล์ ${i + 1}/${buffers.length}...` });
                const doc = await PDFDocument.load(buffers[i]);
                const pages = await merged.copyPages(doc, doc.getPageIndices());
                pages.forEach((p) => merged.addPage(p));
            }

            self.postMessage({ type: "progress", id, message: "กำลังสร้างไฟล์ผลลัพธ์..." });
            const bytes = await merged.save();
            const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
            self.postMessage({ type: "result", id, blob, filename: "merged.pdf" });

        } else if (type === "split") {
            const { buffer, pages } = e.data as { buffer: ArrayBuffer; pages: number[] | "all"; id: string };
            self.postMessage({ type: "progress", id, message: "กำลังโหลด PDF..." });

            const src = await PDFDocument.load(buffer);
            const totalPages = src.getPageCount();
            const pageNumbers: number[] = pages === "all"
                ? Array.from({ length: totalPages }, (_, i) => i)
                : (pages as number[]).map((n) => n - 1).filter((n) => n >= 0 && n < totalPages);

            const blobs: { blob: Blob; filename: string }[] = [];
            for (let i = 0; i < pageNumbers.length; i++) {
                self.postMessage({ type: "progress", id, message: `กำลังแยกหน้า ${i + 1}/${pageNumbers.length}...` });
                const doc = await PDFDocument.create();
                const [copied] = await doc.copyPages(src, [pageNumbers[i]]);
                doc.addPage(copied);
                const bytes = await doc.save();
                blobs.push({
                    blob: new Blob([bytes as unknown as BlobPart], { type: "application/pdf" }),
                    filename: `page-${pageNumbers[i] + 1}.pdf`,
                });
            }

            self.postMessage({ type: "result-split", id, blobs });

        } else if (type === "extract") {
            const { buffer, pages } = e.data as { buffer: ArrayBuffer; pages: number[]; id: string };
            self.postMessage({ type: "progress", id, message: "กำลังโหลด PDF..." });

            const src = await PDFDocument.load(buffer);
            const totalPages = src.getPageCount();
            const pageIndices = (pages as number[]).map((n) => n - 1).filter((n) => n >= 0 && n < totalPages);

            const doc = await PDFDocument.create();
            for (let i = 0; i < pageIndices.length; i++) {
                self.postMessage({ type: "progress", id, message: `กำลังรวมหน้า ${i + 1}/${pageIndices.length}...` });
                const [copied] = await doc.copyPages(src, [pageIndices[i]]);
                doc.addPage(copied);
            }

            self.postMessage({ type: "progress", id, message: "กำลังสร้างไฟล์ผลลัพธ์..." });
            const bytes = await doc.save();
            const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
            self.postMessage({ type: "result", id, blob, filename: "extracted.pdf" });

        } else if (type === "organize") {
            const { pageRequests } = e.data as {
                pageRequests: { buffer: ArrayBuffer; pageIndex: number }[];
                id: string;
            };
            self.postMessage({ type: "progress", id, message: "กำลังสร้าง PDF..." });
            const doc = await PDFDocument.create();
            for (let i = 0; i < pageRequests.length; i++) {
                self.postMessage({ type: "progress", id, message: `กำลังประมวลผลหน้า ${i + 1}/${pageRequests.length}...` });
                const src = await PDFDocument.load(pageRequests[i].buffer);
                const [copied] = await doc.copyPages(src, [pageRequests[i].pageIndex]);
                doc.addPage(copied);
            }
            self.postMessage({ type: "progress", id, message: "กำลังบันทึกไฟล์..." });
            const bytes = await doc.save();
            const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
            self.postMessage({ type: "result", id, blob, filename: "organized.pdf" });
        }
    } catch (err: unknown) {
        self.postMessage({
            type: "error",
            id,
            message: err instanceof Error ? err.message : "เกิดข้อผิดพลาดระหว่างประมวลผล PDF",
        });
    }
};

export { };
