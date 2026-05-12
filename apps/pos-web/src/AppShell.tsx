import { useEffect, useMemo, useState } from "react";
import { API_V1_URL, apiUrl, createPosSocket } from "./config";
import { OrderTimerBadge } from "./components/OrderTimerBadge";
import { CheckoutModal } from "./components/CheckoutModal";
import { KDSBoard } from "./components/KDSBoard";
import { AnalyticsDashboard } from "./components/AnalyticsDashboard";
import { StaffManagement } from "./components/StaffManagement";
import { DeliveryConsole } from "./components/DeliveryConsole";
import { LiveOrders } from "./components/LiveOrders";
import { SettingsPage } from "./components/SettingsPage";
import { ReceiptModal } from "./components/ReceiptModal";
import { InventoryManagement } from "./components/InventoryManagement";
import { FBRTaxPage } from "./components/FBRTaxPage";
import { MenuManagement } from "./components/MenuManagement";
import { CustomerManagement } from "./components/CustomerManagement";
import { AttendanceManagement } from "./components/AttendanceManagement";
import { MainDashboard } from "./components/MainDashboard";
import { LoginScreen } from "./components/LoginScreen";
import { TableGrid } from "./components/TableGrid";

const API = API_V1_URL; // legacy alias; prefer apiUrl(path) for requests
const socket = createPosSocket();

type Tab = "dashboard" | "tables" | "pos" | "orders" | "kds" | "inventory" | "staff" | "attendance" | "delivery" | "analytics" | "fbr" | "settings" | "menu" | "customers";
type OrderStatus = "PENDING" | "PREPARING" | "READY" | "OUT_FOR_DELIVERY" | "COMPLETED" | "CANCELLED" | "FAILED_DELIVERY";

function readPermissionsFromStorage(): string[] | null {
  try {
    const raw = localStorage.getItem("zenpos_permissions");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function normalizeStaffRole(role: string): string {
  return String(role || "").toUpperCase();
}

function isWaiterRole(role: string): boolean {
  return normalizeStaffRole(role) === "WAITER";
}

function canAccessCheckoutRole(role: string): boolean {
  const r = normalizeStaffRole(role);
  return r === "CASHIER" || r === "MASTER_ADMIN" || r === "ADMIN" || r === "MANAGER";
}

function routeLooksLikeCheckout(): boolean {
  const path = (window.location.pathname || "").toLowerCase().replace(/\/+$/, "");
  const hash = (window.location.hash || "").toLowerCase();
  if (path.endsWith("/checkout") || path.endsWith("/billing")) return true;
  if (hash.includes("checkout") || hash.includes("billing")) return true;
  return false;
}

interface MenuItem {
  id: number;
  name: string;
  price: number;
  category: string;
  img: string;
}

const DEFAULT_MENU_ITEMS: MenuItem[] = [
  { id: 1, name: "Double Cheese Smash", price: 650, category: "Burgers", img: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=80" },
  { id: 2, name: "Crispy Zinger Classic", price: 550, category: "Burgers", img: "https://images.unsplash.com/photo-1610440042657-612c34d95e9f?auto=format&fit=crop&w=500&q=80" },
  { id: 3, name: "Truffle Fries", price: 300, category: "Sides", img: "https://images.unsplash.com/photo-1573080496597-1a3f6d764121?auto=format&fit=crop&w=500&q=80" },
  { id: 4, name: "Neon Blue Slush", price: 250, category: "Drinks", img: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=500&q=80" },
  { id: 5, name: "Caramel Macchiato", price: 450, category: "Coffee", img: "https://images.unsplash.com/photo-1485808191679-5f86510681a2?auto=format&fit=crop&w=500&q=80" },
  { id: 6, name: "Dark Espresso", price: 300, category: "Coffee", img: "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&w=500&q=80" },
  { id: 7, name: "Vanilla Bean Sundae", price: 350, category: "Ice Cream", img: "https://images.unsplash.com/photo-1563805042-7684c8a9e9ce?auto=format&fit=crop&w=500&q=80" },
  { id: 8, name: "Chocolate Lava Swirl", price: 400, category: "Ice Cream", img: "https://images.unsplash.com/photo-1557142046-c704a3adf364?auto=format&fit=crop&w=500&q=80" },
];

const CATEGORIES = ["All", "Burgers", "Sides", "Drinks", "Coffee", "Ice Cream"];

export default function AppShell() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);
  const [isTablet, setIsTablet] = useState(() => window.innerWidth >= 768 && window.innerWidth < 1366);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [activeCategory, setActiveCategory] = useState("All");
  const [cart, setCart] = useState<{item: MenuItem, qty: number}[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [token, setToken] = useState<string>(localStorage.getItem('zenpos_token') || "");
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('zenpos_token'));
  const [channel, setChannel] = useState<string>("DINE_IN");
  const [customDiscount, setCustomDiscount] = useState<number>(0);
  const [customTaxRate, setCustomTaxRate] = useState<number | "">("");
  const [showOverrides, setShowOverrides] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<any>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(DEFAULT_MENU_ITEMS);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [userRole, setUserRole] = useState(localStorage.getItem('zenpos_role') || "CASHIER");
  const [userName, setUserName] = useState(localStorage.getItem('zenpos_userName') || "Staff Member");
  const [userPermissions, setUserPermissions] = useState<string[] | null>(readPermissionsFromStorage());
  const [taxRate, setTaxRate] = useState(Number(localStorage.getItem('zenpos_taxRate') || 10) / 100);
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [tableSlots, setTableSlots] = useState<Array<{ tableId: string; occupied: boolean; orderId?: number; orderNo?: string }> | null>(null);

  const isWaiter = isWaiterRole(userRole);
  const canAccessCheckout = canAccessCheckoutRole(userRole);

  useEffect(() => {
    const handleSettingsUpdate = () => setTaxRate(Number(localStorage.getItem('zenpos_taxRate') || 10) / 100);
    window.addEventListener('settings_updated', handleSettingsUpdate);
    return () => window.removeEventListener('settings_updated', handleSettingsUpdate);
  }, []);

  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth < 1024);
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1366);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handleLoginSuccess = (newToken: string, user: any) => {
    const displayName = user.fullName || user.username || "Staff Member";
    setToken(newToken);
    localStorage.setItem('zenpos_token', newToken);
    localStorage.setItem('zenpos_role', user.role);
    localStorage.setItem('zenpos_userName', displayName);
    localStorage.setItem('zenpos_userId', user.id.toString());
    localStorage.setItem('zenpos_permissions', JSON.stringify(user.permissions || null));
    setUserPermissions(user.permissions || null);
    setUserRole(user.role);
    setUserName(displayName);
    setIsAuthenticated(true);
  };

  useEffect(() => {
    if (isAuthenticated && token) {
      fetch(apiUrl("/orders"), { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => res.json())
        .then((ordersData) => setOrders(Array.isArray(ordersData) ? ordersData : []))
        .catch((err) => console.error("Failed to load orders:", err));
    }
  }, [isAuthenticated, token]);

  useEffect(() => {
    if (!isAuthenticated || !token) return;
    fetch(apiUrl("/products"), { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data) || data.length === 0) return;
        setMenuItems(
          data.map((row: any) => ({
            id: Number(row.id),
            name: String(row.name),
            price: Number(row.price),
            category: String(row.category || "Other"),
            img: row.img || row.image_url || ""
          }))
        );
      })
      .catch(() => {});
  }, [isAuthenticated, token]);

  useEffect(() => {
    if (!isAuthenticated || !token || tab !== "tables") return;
    const fetchTables = () => {
      fetch(apiUrl("/tables"), { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((data: { tables?: unknown }) => setTableSlots(Array.isArray(data?.tables) ? (data.tables as any[]) : null))
        .catch(() => setTableSlots(null));
      fetch(apiUrl("/orders?active=1"), { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((ordersData) => setOrders(Array.isArray(ordersData) ? ordersData : []))
        .catch(() => {});
    };
    fetchTables();
    const interval = setInterval(fetchTables, 5000);
    return () => clearInterval(interval);
  }, [isAuthenticated, token, tab]);

  useEffect(() => {
    socket.on("order.created", (order: any) => {
      setOrders(prev => [order, ...prev]);
    });
    
    socket.on("order.status.changed", (updatedOrder: any) => {
      setOrders(prev => prev.map(o => o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o));
    });

    socket.on("order.updated", (updatedOrder: any) => {
      setOrders(prev => prev.map(o => (o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o)));
    });

    return () => {
      socket.off("order.created");
      socket.off("order.status.changed");
      socket.off("order.updated");
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    const guard = () => {
      if (!isWaiterRole(userRole)) return;
      if (!routeLooksLikeCheckout()) return;
      alert("Permission denied: order takers cannot access checkout or billing.");
      setIsCheckoutOpen(false);
      window.history.replaceState(null, "", `/#/tables`);
      setTab("tables");
    };
    guard();
    window.addEventListener("hashchange", guard);
    window.addEventListener("popstate", guard);
    return () => {
      window.removeEventListener("hashchange", guard);
      window.removeEventListener("popstate", guard);
    };
  }, [isAuthenticated, userRole]);

  const filteredMenu = activeCategory === "All" 
    ? menuItems 
    : menuItems.filter(item => item.category === activeCategory);

  const cartTotal = cart.reduce((sum, c) => sum + (c.item.price * c.qty), 0);
  const cartQtyByItemId = useMemo(() => {
    const qtyMap: Record<number, number> = {};
    for (const entry of cart) {
      qtyMap[entry.item.id] = entry.qty;
    }
    return qtyMap;
  }, [cart]);

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const exists = prev.find(c => c.item.id === item.id);
      if (exists) {
        return prev.map(c => c.item.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      }
      return [...prev, { item, qty: 1 }];
    });
  };

  const updateQty = (id: number, delta: number) => {
    setCart(prev => prev.map(c => {
      if (c.item.id === id) {
        const newQty = c.qty + delta;
        return { ...c, qty: newQty };
      }
      return c;
    }).filter(c => c.qty > 0));
  };

  const buildLineItems = () => [
    ...cart.map(c => ({
      menuItemId: c.item.id,
      itemName: c.item.name,
      unitPrice: c.item.price,
      quantity: c.qty
    })),
    ...(customDiscount > 0 ? [{
      menuItemId: 99999,
      itemName: "Manual Discount",
      unitPrice: -Math.abs(customDiscount),
      quantity: 1
    }] : [])
  ];

  const applyOrderToCart = (order: any) => {
    const lines = order?.items || [];
    const disc = lines.find((l: any) => l.menuItemId === 99999);
    setCustomDiscount(disc ? Math.abs(Number(disc.unitPrice) * Number(disc.quantity)) : 0);
    const norm = lines.filter((l: any) => l.menuItemId !== 99999);
    setCart(
      norm.map((line: any) => {
        const mi = menuItems.find((m) => m.id === line.menuItemId);
        if (mi) return { item: mi, qty: line.quantity };
        return {
          item: {
            id: line.menuItemId,
            name: line.itemName || `Item ${line.menuItemId}`,
            price: Number(line.unitPrice) || 0,
            category: "Other",
            img: ""
          },
          qty: line.quantity
        };
      })
    );
    if (order?.channel) setChannel(order.channel);
    if (order?.taxRate !== undefined && order?.taxRate !== null) {
      const tr = Number(order.taxRate);
      if (!Number.isNaN(tr) && tr > 0) setCustomTaxRate(Math.round(tr * 10000) / 100);
      else setCustomTaxRate("");
    } else {
      setCustomTaxRate("");
    }
  };

  const handleSaveKot = async () => {
    if (!token) return alert("Not authenticated!");
    if (cart.length === 0) return alert("Cart is empty.");
    if (!activeTableId) return alert("Pick a table on the Tables screen first.");
    const tableNote = `TABLE:${activeTableId}`;
    const taxVal = customTaxRate !== "" ? Number(customTaxRate) / 100 : taxRate;
    const body: Record<string, unknown> = {
      channel,
      taxRate: taxVal,
      items: buildLineItems(),
      notes: tableNote,
      tableNumber: activeTableId
    };

    try {
      if (editingOrderId) {
        const res = await fetch(apiUrl(`/orders/${editingOrderId}`), {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(body)
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error((errData as { message?: string }).message || "Failed to update order");
        }
        const updated = await res.json();
        setOrders(prev => prev.map(o => (o.id === updated.id ? { ...o, ...updated } : o)));
        alert("KOT updated — cashier will see the changes live.");
        return;
      }

      const res = await fetch(apiUrl("/orders"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...body,
          paymentMethod: undefined
        })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error((errData as { message?: string }).message || "Failed to save order");
      }
      const created = await res.json();
      setEditingOrderId(created.id);
      setOrders(prev => [created, ...prev.filter(o => o.id !== created.id)]);
      alert("Order sent to kitchen (pending payment at cashier).");
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to save order.");
    }
  };

  const handleCheckoutConfirm = async (paymentDetails: any) => {
    if (!token) return alert("Not authenticated!");

    const orderPayload = {
      channel: channel,
      paymentMethod: paymentDetails.method,
      customerId: paymentDetails.customerId,
      customerName: paymentDetails.customerName,
      customerPhone: paymentDetails.customerPhone,
      customerAddress: paymentDetails.customerAddress,
      taxRate: customTaxRate !== "" ? Number(customTaxRate) / 100 : taxRate,
      items: buildLineItems()
    };

    try {
      if (editingOrderId && canAccessCheckout) {
        const method =
          paymentDetails.method === "CASH" ||
          paymentDetails.method === "CARD" ||
          paymentDetails.method === "MOBILE_WALLET" ||
          paymentDetails.method === "KHATA"
            ? paymentDetails.method
            : "CASH";

        const res = await fetch(apiUrl(`/orders/${editingOrderId}/settle`), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            paymentMethod: method,
            customerId: paymentDetails.customerId,
            customerName: paymentDetails.customerName,
            customerPhone: paymentDetails.customerPhone,
            customerAddress: paymentDetails.customerAddress,
            taxRate: orderPayload.taxRate,
            amountGiven: typeof paymentDetails.amountGiven === "number" ? paymentDetails.amountGiven : undefined,
            changeReturned: typeof paymentDetails.changeReturned === "number" ? paymentDetails.changeReturned : undefined,
            items: buildLineItems()
          })
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error((errData as { message?: string }).message || "Failed to settle order");
        }
        const settled = await res.json();
        if (paymentDetails.customerName) {
          settled.customerName = paymentDetails.customerName;
          settled.customerPhone = paymentDetails.customerPhone;
          settled.customerAddress = paymentDetails.customerAddress;
        }
        setOrders(prev => prev.map(o => (o.id === settled.id ? { ...o, ...settled } : o)));
        setCart([]);
        setIsCheckoutOpen(false);
        setEditingOrderId(null);
        setActiveTableId(null);
        setCompletedOrder(settled);
        return;
      }

      const res = await fetch(apiUrl("/orders"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...orderPayload,
          paymentMethod:
            paymentDetails.method === "WALLET" ? "MOBILE_WALLET" : paymentDetails.method === "MOBILE_WALLET" ? "MOBILE_WALLET" : paymentDetails.method
        })
      });

      if (!res.ok) throw new Error("Failed to create order");

      const createdOrder = await res.json();
      if (paymentDetails.customerName) {
        createdOrder.customerName = paymentDetails.customerName;
        createdOrder.customerPhone = paymentDetails.customerPhone;
        createdOrder.customerAddress = paymentDetails.customerAddress;
      }

      setCart([]);
      setIsCheckoutOpen(false);
      setEditingOrderId(null);
      setActiveTableId(null);
      setCompletedOrder(createdOrder);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to process payment & order.");
    }
  };

  const handleUpdateOrderStatus = async (id: number, status: string, reason?: string) => {
    console.log(`Updating order ${id} to ${status} with reason: ${reason}`);
    if (!token) {
      alert("Error: You are not logged in. Please refresh and log in again.");
      return;
    }
    try {
      const res = await fetch(apiUrl(`/orders/${id}/status`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status, reason })
      });
      if (!res.ok) {
        const errData = await res.json();
        alert(`Error: ${errData.message || 'Failed to update order'}`);
      } else {
        const updated = await res.json();
        setOrders(prev => prev.map(o => o.id === updated.id ? { ...o, ...updated } : o));
      }
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("Network error: Could not connect to server.");
    }
  };

  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app-container" style={{ flexDirection: isMobile ? "column" : "row", height: isMobile ? "auto" : "100vh" }}>
      <aside className="glass-panel" style={{ 
        margin: isMobile ? "8px" : "16px 0 16px 16px",
        display: "flex", 
        flexDirection: isMobile ? "row" : "column",
        padding: isMobile ? "12px" : "32px 16px",
        gap: isMobile ? "8px" : "16px",
        width: isMobile ? "calc(100% - 16px)" : isSidebarExpanded ? "250px" : "80px",
        transition: "width 0.3s ease",
        alignItems: isMobile ? "center" : isSidebarExpanded ? "flex-start" : "center",
        overflowX: isMobile ? "auto" : "hidden"
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: isMobile ? "0" : "20px", width: isMobile ? "auto" : "100%", justifyContent: isSidebarExpanded ? 'space-between' : 'center' }}>
          {isSidebarExpanded && !isMobile && <span style={{ fontWeight: 'bold', fontSize: '18px', color: '#fff' }}>Menu</span>}
          <button onClick={() => setIsSidebarExpanded(!isSidebarExpanded)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '20px' }}>
            ☰
          </button>
        </div>
        
        {[
          { id: "dashboard", icon: "📊", label: "Dashboard", roles: ["MASTER_ADMIN", "ADMIN", "MANAGER"] },
          { id: "tables", icon: "🪑", label: "Tables", roles: ["MASTER_ADMIN", "ADMIN", "MANAGER", "CASHIER", "WAITER"] },
          { id: "pos", icon: "🛒", label: "Point of Sale", roles: ["MASTER_ADMIN", "ADMIN", "MANAGER", "CASHIER", "WAITER"] },
          { id: "orders", icon: "📋", label: "Orders", roles: ["MASTER_ADMIN", "ADMIN", "MANAGER", "CASHIER", "KITCHEN"] },
          { id: "kds", icon: "🔥", label: "Kitchen Display", roles: ["MASTER_ADMIN", "ADMIN", "KITCHEN", "MANAGER"] },
          { id: "menu", icon: "🍔", label: "Menu Management", roles: ["MASTER_ADMIN", "ADMIN", "MANAGER"] },
          { id: "inventory", icon: "📦", label: "Inventory", roles: ["MASTER_ADMIN", "ADMIN", "MANAGER"] },
          { id: "delivery", icon: "🛵", label: "Delivery", roles: ["MASTER_ADMIN", "ADMIN", "DELIVERY", "MANAGER", "CASHIER"] },
          { id: "customers", icon: "🧑‍🤝‍🧑", label: "Customers & Khata", roles: ["MASTER_ADMIN", "ADMIN", "MANAGER", "CASHIER"] },
          { id: "staff", icon: "👥", label: "Staff HR", roles: ["MASTER_ADMIN", "ADMIN"] },
          { id: "attendance", icon: "📅", label: "Attendance", roles: ["MASTER_ADMIN", "ADMIN", "MANAGER", "CASHIER", "KITCHEN", "DELIVERY"] },
          { id: "analytics", icon: "📈", label: "Reports", roles: ["MASTER_ADMIN", "ADMIN", "MANAGER"] },
          { id: "fbr", icon: "🏛️", label: "FBR Tax", roles: ["MASTER_ADMIN", "ADMIN"] },
          { id: "settings", icon: "⚙️", label: "Settings", roles: ["MASTER_ADMIN", "ADMIN"] }
        ].filter(item => userPermissions ? userPermissions.includes(item.id) : item.roles.includes(userRole)).map(item => (
          <button  
            key={item.id}
            className={`nav-button ${tab === item.id ? "active" : ""}`} 
            onClick={() => setTab(item.id as Tab)} 
            title={item.label}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '16px', 
              width: isMobile ? "56px" : '100%',
              justifyContent: isSidebarExpanded ? 'flex-start' : 'center',
              padding: isSidebarExpanded ? '12px 16px' : '12px',
              borderRadius: '12px'
            }}
          >
            <span style={{ fontSize: '20px' }}>{item.icon}</span>
            {isSidebarExpanded && !isMobile && <span style={{ fontSize: '14px', fontWeight: 500, whiteSpace: 'nowrap' }}>{item.label}</span>}
          </button>
        ))}

        {!isMobile && <div style={{ flex: 1 }} />}
        <button 
          className="nav-button"
          onClick={() => {
            localStorage.removeItem('zenpos_token');
            setActiveTableId(null);
            setEditingOrderId(null);
            setIsCheckoutOpen(false);
            setIsAuthenticated(false);
            setToken("");
          }}
          title="Logout"
          style={{ 
            display: 'flex', alignItems: 'center', gap: '16px', width: isMobile ? "56px" : '100%', justifyContent: isSidebarExpanded ? 'flex-start' : 'center',
            padding: isSidebarExpanded ? '12px 16px' : '12px', borderRadius: '12px', color: 'var(--accent-pink)', marginTop: isMobile ? 0 : 'auto'
          }}
        >
          <span style={{ fontSize: '20px' }}>🚪</span>
          {isSidebarExpanded && !isMobile && <span style={{ fontSize: '14px', fontWeight: 500, whiteSpace: 'nowrap' }}>Logout</span>}
        </button>
      </aside>

      <main style={{ padding: isMobile ? "12px" : "16px 24px", overflowY: "auto", height: isMobile ? "auto" : "100vh", flex: 1 }}>
        <header style={{ display: 'flex', flexDirection: isMobile ? "column" : "row", justifyContent: 'space-between', alignItems: isMobile ? "flex-start" : 'center', gap: isMobile ? "12px" : "0", marginBottom: '32px', marginTop: '16px' }}>
          <div>
            <h1 className="gradient-text" style={{ fontSize: '32px', margin: 0 }}>Frost & Brew</h1>
            <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Welcome back, {userName} ({userRole})</p>
            {tab === "pos" && activeTableId && (
              <p style={{ color: "var(--accent-blue)", margin: "8px 0 0 0", fontSize: "15px", fontWeight: 600 }}>
                Active table: {activeTableId}
                {editingOrderId ? ` · Ticket #${editingOrderId}` : ""}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#00ff66', background: 'rgba(0,255,102,0.1)', padding: '6px 12px', borderRadius: '20px', fontSize: '14px', fontWeight: 600 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00ff66', boxShadow: '0 0 10px #00ff66' }} />
              ONLINE
            </span>
          </div>
        </header>

        {tab === "dashboard" && <MainDashboard />}

        {tab === "tables" && (
          <TableGrid
            orders={orders}
            tablesFromApi={tableSlots}
            onTableClick={({ tableId, occupied, orderId }) => {
              setActiveTableId(tableId);
              if (occupied && orderId != null) {
                const order = orders.find((o) => o.id === orderId);
                if (order) {
                  applyOrderToCart(order);
                  setEditingOrderId(order.id);
                  const nr = normalizeStaffRole(userRole);
                  if (nr === "WAITER") {
                    window.history.replaceState(null, "", `/#/pos`);
                    setTab("pos");
                    setIsCheckoutOpen(false);
                  } else if (canAccessCheckoutRole(userRole)) {
                    window.history.replaceState(null, "", `/#/checkout`);
                    setTab("pos");
                    setIsCheckoutOpen(true);
                  }
                  return;
                }
              }
              setEditingOrderId(null);
              setCart([]);
              setCustomDiscount(0);
              setCustomTaxRate("");
              window.history.replaceState(null, "", `/#/pos`);
              setTab("pos");
              setIsCheckoutOpen(false);
            }}
          />
        )}

        {tab === "pos" && (
          <>
            <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '24px', scrollbarWidth: 'none' }}>
              {CATEGORIES.map(cat => (
                <button 
                  key={cat} 
                  className={`category-pill ${activeCategory === cat ? 'active' : ''}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="menu-grid">
              {filteredMenu.map(item => (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  className="menu-card"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") addToCart(item);
                  }}
                  onClick={() => addToCart(item)}
                  style={{ padding: isTablet ? '20px' : '16px' }}
                >
                  <img src={item.img} alt={item.name} className="menu-card-img" />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '4px' }}>
                    <h3 style={{ fontSize: '16px', margin: 0, lineHeight: 1.3 }}>{item.name}</h3>
                    <span style={{ color: 'var(--accent-blue)', fontWeight: 700, fontSize: '18px' }}>Rs {item.price}</span>
                  </div>
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginTop: '10px' }}
                  >
                    {cartQtyByItemId[item.id] ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button
                          type="button"
                          className="qty-btn"
                          style={{ width: isTablet ? '40px' : '28px', height: isTablet ? '40px' : '28px', fontSize: isTablet ? '18px' : '14px' }}
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            updateQty(item.id, -1);
                          }}
                        >
                          -
                        </button>
                        <span style={{ minWidth: '20px', textAlign: 'center', fontWeight: 700 }}>{cartQtyByItemId[item.id]}</span>
                        <button
                          type="button"
                          className="qty-btn"
                          style={{ width: isTablet ? '40px' : '28px', height: isTablet ? '40px' : '28px', fontSize: isTablet ? '18px' : '14px' }}
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            updateQty(item.id, 1);
                          }}
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Not in order</span>
                    )}
                    <button
                      type="button"
                      className="rgb-button filled"
                      style={{ width: 'auto', padding: isTablet ? '10px 14px' : '8px 12px', borderRadius: '10px', fontSize: isTablet ? '15px' : '13px' }}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(item);
                      }}
                    >
                      Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "orders" && <LiveOrders orders={orders} onCancelOrder={(id, reason) => handleUpdateOrderStatus(id, "CANCELLED", reason)} onFailOrder={(id, reason) => handleUpdateOrderStatus(id, "FAILED_DELIVERY", reason)} onReprintOrder={setCompletedOrder} />}
        {tab === "kds" && <KDSBoard orders={orders} onUpdateStatus={handleUpdateOrderStatus} />}
        {tab === "analytics" && <AnalyticsDashboard />}
        {tab === "staff" && <StaffManagement />}
        {tab === "attendance" && <AttendanceManagement />}
        {tab === "menu" && <MenuManagement token={token} onCatalogChanged={setMenuItems} />}
        {tab === "inventory" && <InventoryManagement />}
        {tab === "delivery" && <DeliveryConsole orders={orders} onUpdateStatus={(id, status) => {
          if (status === "FAILED_DELIVERY") {
            const r = prompt("Enter failure reason:");
            if (r !== null) handleUpdateOrderStatus(id, status, r);
          } else {
            handleUpdateOrderStatus(id, status);
          }
        }} />}
        {tab === "customers" && <CustomerManagement />}
        {tab === "fbr" && <FBRTaxPage />}
        {tab === "settings" && <SettingsPage />}
      </main>

      {tab === "pos" && (
      <aside className="glass-panel" style={{ margin: isMobile ? "8px" : "16px 16px 16px 0", display: "flex", flexDirection: "column", padding: "24px", width: isMobile ? "calc(100% - 16px)" : "380px", minWidth: isMobile ? "auto" : "380px", overflowY: "hidden" }}>
        <h2 style={{ fontSize: '20px', marginBottom: '24px' }}>Current Order</h2>
        
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px', marginRight: '-8px' }}>
          {cart.length === 0 ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              Cart is empty
            </div>
          ) : (
            cart.map(c => (
              <div key={c.item.id} className="cart-item">
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>{c.item.name}</div>
                  <div style={{ color: 'var(--accent-blue)', fontSize: '14px', fontWeight: 600 }}>Rs {c.item.price * c.qty}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button type="button" className="qty-btn" onClick={() => updateQty(c.item.id, -1)}>-</button>
                  <span style={{ fontWeight: 600, width: '16px', textAlign: 'center' }}>{c.qty}</span>
                  <button type="button" className="qty-btn" onClick={() => updateQty(c.item.id, 1)}>+</button>
                  <button type="button" onClick={() => updateQty(c.item.id, -c.qty)} style={{ background: 'transparent', border: 'none', color: 'var(--accent-pink)', cursor: 'pointer', marginLeft: '4px', padding: '4px' }} title="Remove Item">🗑️</button>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-glass)' }}>
          <button
            className="rgb-button"
            disabled={cart.length === 0}
            style={{ marginBottom: '12px', opacity: cart.length === 0 ? 0.5 : 1, padding: isTablet ? '14px 16px' : '10px 12px' }}
            onClick={() => setCart([])}
          >
            Clear Cart
          </button>
          <button onClick={() => setShowOverrides(!showOverrides)} style={{ background: 'transparent', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', marginBottom: '16px', fontSize: '14px', padding: 0 }}>
             {showOverrides ? "- Hide Overrides" : "+ Manual Discount / Tax Override"}
          </button>
          
          {showOverrides && (
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
               <div style={{ flex: 1 }}>
                 <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Discount (Rs)</label>
                 <input type="number" min="0" value={customDiscount || ""} onChange={e => setCustomDiscount(Number(e.target.value))} style={{ width: '100%', padding: '8px', background: 'var(--bg-dark)', border: '1px solid var(--border-glass)', color: '#fff', borderRadius: '4px', outline: 'none' }} placeholder="0" />
               </div>
               <div style={{ flex: 1 }}>
                 <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Custom Tax (%)</label>
                 <input type="number" min="0" value={customTaxRate} onChange={e => setCustomTaxRate(e.target.value ? Number(e.target.value) : "")} style={{ width: '100%', padding: '8px', background: 'var(--bg-dark)', border: '1px solid var(--border-glass)', color: '#fff', borderRadius: '4px', outline: 'none' }} placeholder={`${taxRate * 100}`} />
               </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: 'var(--text-muted)' }}>
            <span>Subtotal</span>
            <span>Rs {cartTotal}</span>
          </div>
          {customDiscount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: 'var(--accent-pink)' }}>
              <span>Discount</span>
              <span>- Rs {customDiscount}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', color: 'var(--text-muted)' }}>
            <span>Tax ({customTaxRate !== "" ? customTaxRate : taxRate * 100}%)</span>
            <span>Rs {Math.round((cartTotal - customDiscount) * (customTaxRate !== "" ? Number(customTaxRate) / 100 : taxRate))}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', fontSize: '24px', fontWeight: 700 }}>
            <span>Total</span>
            <span style={{ color: 'var(--accent-blue)' }}>Rs {Math.max(0, Math.round((cartTotal - customDiscount) * (1 + (customTaxRate !== "" ? Number(customTaxRate) / 100 : taxRate))))}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
             <button 
               className={`rgb-button ${channel === "DINE_IN" ? "filled" : ""}`} 
               style={{ padding: '12px', fontSize: '14px', background: channel === "DINE_IN" ? 'rgba(0,240,255,0.2)' : '' }}
               onClick={() => setChannel("DINE_IN")}
             >
               Dine In
             </button>
             <button 
               className={`rgb-button ${channel === "TAKEAWAY" ? "filled" : ""}`} 
               style={{ padding: '12px', fontSize: '14px', background: channel === "TAKEAWAY" ? 'rgba(255,0,127,0.2)' : '' }}
               onClick={() => setChannel("TAKEAWAY")}
             >
               Takeaway
             </button>
             <button
               className={`rgb-button ${channel === "DELIVERY" ? "filled" : ""}`}
               style={{ padding: '12px', fontSize: '14px', background: channel === "DELIVERY" ? 'rgba(0,255,102,0.2)' : '' }}
               onClick={() => setChannel("DELIVERY")}
             >
               Delivery
             </button>
          </div>

          {canAccessCheckout ? (
            <button
              type="button"
              className="rgb-button filled"
              disabled={cart.length === 0}
              style={{ opacity: cart.length === 0 ? 0.5 : 1 }}
              onClick={() => {
                window.history.replaceState(null, "", `/#/checkout`);
                setIsCheckoutOpen(true);
              }}
            >
              Proceed to Payment
            </button>
          ) : isWaiter ? (
            <button
              type="button"
              className="rgb-button filled"
              disabled={cart.length === 0}
              style={{ opacity: cart.length === 0 ? 0.5 : 1 }}
              onClick={() => void handleSaveKot()}
            >
              {editingOrderId ? "Update KOT" : "Confirm order (send to kitchen)"}
            </button>
          ) : null}
        </div>
      </aside>
      )}

      <CheckoutModal  
        isOpen={isCheckoutOpen} 
        onClose={() => setIsCheckoutOpen(false)} 
        total={Math.max(0, Math.round((cartTotal - customDiscount) * (1 + (customTaxRate !== "" ? Number(customTaxRate) / 100 : taxRate))))}
        onConfirm={handleCheckoutConfirm} 
      />

      <ReceiptModal 
        order={completedOrder} 
        onClose={() => setCompletedOrder(null)} 
      />
    </div>
  );
}
