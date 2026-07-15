import "./globals.css";

export const metadata = {
  title: "BPRS HIK MCI - Pembiayaan Pensiunan Grahadi",
  description: "Portal Pengajuan Pembiayaan Pensiunan Kerja Sama BPRS HIK MCI dan GRAHADI",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

