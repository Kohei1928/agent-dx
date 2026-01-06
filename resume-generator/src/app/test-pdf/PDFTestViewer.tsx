"use client";

import PDFViewer from "@/components/PDFViewer";
import type { CvData } from "@/types";

interface PDFTestViewerProps {
  data: CvData;
}

export default function PDFTestViewer({ data }: PDFTestViewerProps) {
  return <PDFViewer type="cv" data={data} />;
}
