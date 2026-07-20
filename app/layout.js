import "./globals.css";

export const metadata = {
  title: "BPRS HIK MCI - Portal Pembiayaan Pensiunan",
  description: "Portal Pengajuan Pembiayaan Pensiunan & Checking SLIK OJK BPRS HIK MCI",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
