import { Bricolage_Grotesque, Plus_Jakarta_Sans } from "next/font/google";
import SmoothScroll from "@/components/SmoothScroll";
import { CartProvider } from "@/context/CartContext";
import { UserProvider } from "@/context/UserContext";
import AnnouncementBar from "@/components/AnnouncementBar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import CartFly from "@/components/CartFly";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata = {
  title: "OROS — 3D Printed Goods, Printed to Order",
  description:
    "Shop 3D printed figurines, lighting, desk storage and decor. Printed to order, shipped in 48 hours. Bulk pricing from 25 units.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${bricolage.variable} ${jakarta.variable}`}>
      <body>
        <UserProvider>
          <CartProvider>
          <SmoothScroll>
            <AnnouncementBar />
            <Header />
            <main className="min-h-screen">{children}</main>
            <Footer />
            <CartDrawer />
            <CartFly />
          </SmoothScroll>
        </CartProvider>
        </UserProvider>
      </body>
    </html>
  );
}
