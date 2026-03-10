"use client";

import React, { useRef, useEffect, useState } from "react";
import JsBarcode from "jsbarcode";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { apiPost } from "@/lib/api";
import { showToast } from "@/components/ui/toast";
import { Printer, Download } from "lucide-react";

interface BarcodeDialogProps {
  open: boolean;
  onClose: () => void;
  variant: {
    sku: string;
    barcode?: string;
    articleName?: string;
    color?: string;
    size?: string;
  } | null;
  onBarcodeGenerated?: () => void;
}

export function BarcodeDialog({ open, onClose, variant, onBarcodeGenerated }: BarcodeDialogProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [barcode, setBarcode] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (variant?.barcode) {
      setBarcode(variant.barcode);
    } else {
      setBarcode(null);
    }
  }, [variant]);

  useEffect(() => {
    if (barcode && svgRef.current) {
      try {
        JsBarcode(svgRef.current, barcode, {
          format: "CODE128",
          width: 1.5,
          height: 50,
          displayValue: true,
          fontSize: 11,
          margin: 5,
          background: "#ffffff",
          lineColor: "#000000",
        });
      } catch {
        // barcode rendering error
      }
    }
  }, [barcode]);

  const handleGenerate = async () => {
    if (!variant) return;
    setGenerating(true);
    try {
      const res = await apiPost(`/variants/generate-barcode/${variant.sku}`, {});
      if (res.barcode) {
        setBarcode(res.barcode);
        showToast("Barcode generated successfully", "success");
        onBarcodeGenerated?.();
      }
    } catch (err: unknown) {
      showToast((err as Error).message || "Failed to generate barcode", "error");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!svgRef.current) return;
    const svg = svgRef.current;
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgWidth = svg.width.baseVal.value || 200;
    const svgHeight = svg.height.baseVal.value || 80;
    const scale = 2;

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(svgWidth * scale, 200);
    canvas.height = (svgHeight + 36) * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#000000";
      ctx.font = `bold ${10 * scale}px Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(variant?.articleName || "", canvas.width / 2, 12 * scale);

      ctx.font = `${8 * scale}px Arial, sans-serif`;
      ctx.fillStyle = "#555555";
      ctx.fillText(`${variant?.color || ""} / ${variant?.size || ""}`, canvas.width / 2, 20 * scale);

      const barcodeX = (canvas.width - svgWidth * scale) / 2;
      ctx.drawImage(img, barcodeX, 24 * scale, svgWidth * scale, svgHeight * scale);

      const link = document.createElement("a");
      link.download = `barcode_${variant?.sku || "label"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handlePrint = () => {
    if (!svgRef.current) return;
    const svgHtml = svgRef.current.outerHTML;
    const printWindow = window.open("", "_blank", "width=300,height=200");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Barcode - ${variant?.sku || ""}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          @page { size: 50mm 30mm; margin: 0; }
          body { display: flex; align-items: center; justify-content: center; width: 50mm; height: 30mm; font-family: Arial, sans-serif; }
          .label { text-align: center; width: 100%; padding: 1mm 2mm; }
          .name { font-size: 7pt; font-weight: bold; margin-bottom: 1mm; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .details { font-size: 5pt; color: #555; margin-top: 0.5mm; }
          svg { max-width: 44mm; height: auto; }
        </style>
      </head>
      <body>
        <div class="label">
          <div class="name">${variant?.articleName || ""}</div>
          ${svgHtml}
          <div class="details">${variant?.color || ""} / ${variant?.size || ""}</div>
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Barcode"
      description={`Barcode for variant: ${variant?.sku || ""}`}
    >
      <div className="flex flex-col items-center gap-3 py-2">
        {variant && (
          <div className="text-center">
            <p className="text-sm font-medium">{variant.articleName}</p>
            <p className="text-xs text-muted-foreground">{variant.color} / {variant.size}</p>
          </div>
        )}

        {barcode ? (
          <>
            <div className="bg-white p-2 rounded-lg border border-border inline-block">
              <svg ref={svgRef} />
            </div>
            <p className="text-xs font-mono text-muted-foreground">{barcode}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint} className="cursor-pointer gap-1.5">
                <Printer className="w-3.5 h-3.5" />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload} className="cursor-pointer gap-1.5">
                <Download className="w-3.5 h-3.5" />
                Download
              </Button>
              <Button variant="outline" size="sm" onClick={onClose} className="cursor-pointer">
                Close
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-4">No barcode assigned to this variant yet.</p>
            <Button onClick={handleGenerate} disabled={generating} className="cursor-pointer">
              {generating ? "Generating..." : "Generate Barcode"}
            </Button>
          </div>
        )}
      </div>
    </Dialog>
  );
}
