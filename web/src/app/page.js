"use client";

import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { API_URL, apiRequest } from "../lib/api";

const CATEGORIES = ["Todos", "Bebidas", "Entradas", "Postres", "Principales"];
const KANBAN_COLUMNS = [
  { key: "PENDIENTE", label: "Pendiente", nextStatus: "PREPARING", nextLabel: "Pasar a En preparación" },
  { key: "PREPARING", label: "En preparación", nextStatus: "READY", nextLabel: "Marcar Listo" },
  { key: "READY", label: "Listo", nextStatus: "DELIVERED", nextLabel: "Marcar Entregado" },
  { key: "DELIVERED", label: "Entregado", nextStatus: null, nextLabel: null },
];

export default function HomePage() {
  const [dishes, setDishes] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [cart, setCart] = useState([]);
  const [address, setAddress] = useState("");
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [kitchenOrders, setKitchenOrders] = useState([]);

  const [authMode, setAuthMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem("platoya_token") || "";
    const savedUser = localStorage.getItem("platoya_user");
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
  }, []);

  useEffect(() => {
    apiRequest("/api/dishes")
      .then((data) => setDishes(data.dishes || []))
      .catch((err) => setFeedback(err.message));
  }, []);

  useEffect(() => {
    if (!token || !user) return;
    if (user.role === "cliente") {
      apiRequest("/api/orders/me", { token })
        .then((data) => setOrders(data.orders || []))
        .catch(() => {});
    } else if (user.role === "cocinero") {
      apiRequest("/api/orders/kitchen", { token })
        .then((data) => setKitchenOrders(data.orders || []))
        .catch(() => {});
    }
  }, [token, user]);

  useEffect(() => {
    if (!token || !user) return;
    const socket = io(API_URL, {
      auth: { token },
    });

    socket.on("order:updated", (updatedOrder) => {
      if (user.role === "cliente") {
        setOrders((prev) => {
          const exists = prev.some((o) => o._id === updatedOrder._id);
          return exists
            ? prev.map((o) => (o._id === updatedOrder._id ? updatedOrder : o))
            : [updatedOrder, ...prev];
        });
      }
    });

    socket.on("order:created", (newOrder) => {
      if (user.role === "cocinero") {
        setKitchenOrders((prev) => {
          if (prev.some((o) => o._id === newOrder._id)) return prev;
          return [...prev, newOrder];
        });
      }
    });

    socket.on("order:statusChanged", (updatedOrder) => {
      if (user.role === "cocinero") {
        setKitchenOrders((prev) =>
          prev.map((o) => (o._id === updatedOrder._id ? updatedOrder : o))
        );
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [token, user]);

  const filteredDishes = useMemo(() => {
    if (selectedCategory === "Todos") return dishes;
    return dishes.filter((d) => d.category === selectedCategory);
  }, [dishes, selectedCategory]);

  const cartTotal = useMemo(
    () => cart.reduce((acc, item) => acc + item.price * item.quantity, 0),
    [cart]
  );

  function addToCart(dish) {
    if (!dish.available) return;
    setCart((prev) => {
      const existing = prev.find((i) => i._id === dish._id);
      if (existing) {
        return prev.map((i) =>
          i._id === dish._id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...dish, quantity: 1 }];
    });
  }

  function updateQuantity(dishId, delta) {
    setCart((prev) =>
      prev
        .map((i) => (i._id === dishId ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  }

  async function handleAuth(e) {
    e.preventDefault();
    setFeedback("");
    setLoading(true);
    try {
      const endpoint = authMode === "register" ? "/api/auth/register" : "/api/auth/login";
      const payload = authMode === "register" ? { name, email, password } : { email, password };
      const data = await apiRequest(endpoint, { method: "POST", body: payload });
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem("platoya_token", data.token);
      localStorage.setItem("platoya_user", JSON.stringify(data.user));
      setFeedback(`Sesión iniciada como ${data.user.name} (${data.user.role})`);
    } catch (err) {
      setFeedback(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    setToken("");
    setUser(null);
    setOrders([]);
    setKitchenOrders([]);
    localStorage.removeItem("platoya_token");
    localStorage.removeItem("platoya_user");
  }

  async function handleCreateOrder(e) {
    e.preventDefault();
    if (!token) {
      setFeedback("Inicia sesión como cliente para crear tu pedido.");
      return;
    }
    setFeedback("");
    setLoading(true);
    try {
      const payload = {
        address,
        items: cart.map((item) => ({ dishId: item._id, quantity: item.quantity })),
      };
      const data = await apiRequest("/api/orders", {
        method: "POST",
        body: payload,
        token,
      });
      setCart([]);
      setOrders((prev) => [data.order, ...prev]);
      setFeedback(`Pedido #${data.order._id.slice(-6)} creado en PENDING_PAYMENT. Ya puedes pagarlo.`);
    } catch (err) {
      setFeedback(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handlePayOrder(orderId) {
    setFeedback("");
    setLoading(true);
    try {
      const created = await apiRequest("/api/payments/paypal/order", {
        method: "POST",
        body: { orderId },
        token,
      });
      const captured = await apiRequest("/api/payments/paypal/capture", {
        method: "POST",
        body: { orderId, paypalOrderId: created.paypalOrderId },
        token,
      });
      setOrders((prev) =>
        prev.map((o) => (o._id === captured.order._id ? captured.order : o))
      );
      setFeedback(`Pago confirmado para #${orderId.slice(-6)}. Pedido enviado a cocina (PENDIENTE).`);
    } catch (err) {
      setFeedback(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdvanceStatus(orderId, nextStatus) {
    setFeedback("");
    setLoading(true);
    try {
      const data = await apiRequest(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        body: { status: nextStatus },
        token,
      });
      setKitchenOrders((prev) =>
        prev.map((o) => (o._id === data.order._id ? data.order : o))
      );
      setFeedback(`Pedido #${orderId.slice(-6)} actualizado a ${data.order.status}.`);
    } catch (err) {
      setFeedback(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-800 pb-4">
        <div>
          <h1 className="text-3xl font-bold text-amber-400">PlatoYa</h1>
          <p className="text-sm text-stone-400">Reserva y pedido de platos en tiempo real</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {user?.role === "cliente" && (
            <span className="rounded-full bg-stone-900 px-3 py-1 border border-stone-700">
              Carrito ({cart.reduce((acc, i) => acc + i.quantity, 0)})
            </span>
          )}
          {user && (
            <>
              <span className="text-stone-300">{user.name} · {user.role}</span>
              <button
                onClick={handleLogout}
                className="rounded-lg border border-stone-700 px-3 py-1 hover:bg-stone-800"
              >
                Salir
              </button>
            </>
          )}
        </div>
      </header>

      {feedback && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {feedback}
        </div>
      )}

      {!user && (
        <section className="rounded-2xl border border-stone-800 bg-stone-900/70 p-5 max-w-md space-y-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAuthMode("login")}
              className={`px-3 py-1 rounded-lg text-sm ${authMode === "login" ? "bg-amber-400 text-stone-950 font-semibold" : "bg-stone-800"}`}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => setAuthMode("register")}
              className={`px-3 py-1 rounded-lg text-sm ${authMode === "register" ? "bg-amber-400 text-stone-950 font-semibold" : "bg-stone-800"}`}
            >
              Registrarse
            </button>
          </div>
          <p className="text-xs text-stone-400">
            Cocinero demo: <code>cocinero@platoya.com</code> / <code>Cocina2026!</code>
          </p>
          <form onSubmit={handleAuth} className="space-y-3">
            {authMode === "register" && (
              <input
                type="text"
                placeholder="Nombre completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm"
              />
            )}
            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm"
            />
            <input
              type="password"
              placeholder="Contraseña (mín. 6 caracteres)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-amber-400 py-2 text-sm font-semibold text-stone-950 hover:bg-amber-300 disabled:opacity-50"
            >
              {authMode === "register" ? "Crear cuenta cliente" : "Entrar"}
            </button>
          </form>
        </section>
      )}

      {user?.role === "cocinero" ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Tablero de cocina (Kanban en tiempo real)</h2>
            <span className="text-xs text-emerald-400">En vivo · Socket.IO</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {KANBAN_COLUMNS.map((col) => {
              const colOrders = kitchenOrders.filter((o) => o.status === col.key);
              return (
                <div key={col.key} className="rounded-2xl border border-stone-800 bg-stone-900/60 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                    <h3 className="font-semibold text-amber-400">{col.label}</h3>
                    <span className="text-xs rounded-full bg-stone-800 px-2 py-0.5">{colOrders.length}</span>
                  </div>
                  {colOrders.length === 0 ? (
                    <p className="text-xs text-stone-500">Sin pedidos aquí.</p>
                  ) : (
                    colOrders.map((ord) => (
                      <div key={ord._id} className="rounded-xl border border-stone-800 bg-stone-950 p-3 space-y-2 text-xs">
                        <div className="flex justify-between font-semibold">
                          <span>#{ord._id.slice(-6)}</span>
                          <span className="text-amber-400">${Number(ord.total).toFixed(2)}</span>
                        </div>
                        <ul className="space-y-1 text-stone-300">
                          {(ord.items || []).map((it, idx) => (
                            <li key={idx}>
                              {it.quantity}x {it.name}
                            </li>
                          ))}
                        </ul>
                        {col.nextStatus && (
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => handleAdvanceStatus(ord._id, col.nextStatus)}
                            className="mt-2 w-full rounded-lg bg-amber-400 py-1.5 font-semibold text-stone-950 hover:bg-amber-300 disabled:opacity-40"
                          >
                            {col.nextLabel}
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <div className="grid gap-8 lg:grid-cols-3">
          <section className="lg:col-span-2 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-2xl font-semibold">Menú</h2>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`rounded-full px-3 py-1 text-xs border ${
                      selectedCategory === cat
                        ? "border-amber-400 bg-amber-400 text-stone-950 font-semibold"
                        : "border-stone-700 text-stone-300 hover:bg-stone-800"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {filteredDishes.map((dish) => (
                <article
                  key={dish._id}
                  className="flex flex-col justify-between rounded-2xl border border-stone-800 bg-stone-900/60 p-4"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-amber-400 uppercase tracking-wide">
                      <span>{dish.category}</span>
                      <span className="font-bold text-sm">${Number(dish.price).toFixed(2)}</span>
                    </div>
                    <h3 className="mt-1 text-lg font-semibold">{dish.name}</h3>
                    <p className="mt-1 text-sm text-stone-400">{dish.description}</p>
                  </div>
                  <button
                    onClick={() => addToCart(dish)}
                    disabled={!dish.available}
                    className="mt-4 rounded-lg bg-stone-800 py-2 text-sm font-medium hover:bg-amber-400 hover:text-stone-950 disabled:opacity-40"
                  >
                    {dish.available ? "Añadir" : "No disponible"}
                  </button>
                </article>
              ))}
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-stone-800 bg-stone-900/60 p-5 space-y-4">
              <h2 className="text-xl font-semibold">Carrito</h2>
              {cart.length === 0 ? (
                <p className="text-sm text-stone-400">Aún no has agregado platos.</p>
              ) : (
                <ul className="space-y-3">
                  {cart.map((item) => (
                    <li key={item._id} className="flex items-center justify-between text-sm border-b border-stone-800 pb-2">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-stone-400">${(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item._id, -1)}
                          className="h-7 w-7 rounded bg-stone-800 hover:bg-stone-700"
                        >
                          -
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item._id, 1)}
                          className="h-7 w-7 rounded bg-stone-800 hover:bg-stone-700"
                        >
                          +
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <form onSubmit={handleCreateOrder} className="space-y-3 pt-2">
                <label className="block text-xs text-stone-400">Dirección de entrega</label>
                <input
                  type="text"
                  placeholder="Ej. Calle 100 # 45-20"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                  className="w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm"
                />
                <div className="flex items-center justify-between font-semibold pt-1">
                  <span>Total estimado:</span>
                  <span className="text-amber-400">${cartTotal.toFixed(2)}</span>
                </div>
                <button
                  type="submit"
                  disabled={loading || cart.length === 0}
                  className="w-full rounded-lg bg-amber-400 py-2.5 text-sm font-semibold text-stone-950 hover:bg-amber-300 disabled:opacity-40"
                >
                  Confirmar pedido
                </button>
              </form>
            </section>

            {user?.role === "cliente" && (
              <section className="rounded-2xl border border-stone-800 bg-stone-900/60 p-5 space-y-3">
                <h2 className="text-xl font-semibold">Mis pedidos</h2>
                {orders.length === 0 ? (
                  <p className="text-sm text-stone-400">Sin pedidos registrados todavía.</p>
                ) : (
                  <ul className="space-y-3 text-sm">
                    {orders.map((ord) => (
                      <li key={ord._id} className="rounded-xl border border-stone-800 bg-stone-950/70 p-3 space-y-2">
                        <div className="flex justify-between font-semibold">
                          <span>#{ord._id.slice(-6)}</span>
                          <span className="text-amber-400">${Number(ord.total).toFixed(2)}</span>
                        </div>
                        <p className="text-xs text-stone-400">
                          Estado: <strong className="text-stone-200">{ord.status}</strong> · Pago: {ord.paymentStatus}
                        </p>
                        <p className="text-xs text-stone-400">Dirección: {ord.address}</p>
                        {ord.status === "PENDING_PAYMENT" && (
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => handlePayOrder(ord._id)}
                            className="w-full rounded-lg bg-amber-400 py-1.5 text-xs font-semibold text-stone-950 hover:bg-amber-300 disabled:opacity-40"
                          >
                            Pagar pedido (PayPal Sandbox)
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </aside>
        </div>
      )}
    </main>
  );
}