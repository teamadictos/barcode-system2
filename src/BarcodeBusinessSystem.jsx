import React, { useEffect, useMemo, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import { Html5QrcodeScanner } from "html5-qrcode";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

// Firebase
import { db } from "./firebase";

import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";

/*
====================================================
 SISTEMA DE CÓDIGO DE BARRAS v1.0
====================================================
 Funciones:
 - Generar códigos de barra
 - Escanear con celular
 - Guardar en Firebase
 - Editar productos
 - Eliminar productos
 - Descargar códigos
====================================================
*/

export default function BarcodeBusinessSystem() {
  // =============================
  // Estados principales
  // =============================

  const [products, setProducts] = useState([]);
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("General");

  // Buscador en tiempo real
  const [searchTerm, setSearchTerm] = useState("");

  // Filtro de orden
  const [filterType, setFilterType] = useState("recent");

  const [editingProduct, setEditingProduct] = useState(null);
  const [newName, setNewName] = useState("");

  const [scannerOpen, setScannerOpen] = useState(false);

  const [scanResult, setScanResult] = useState("");
  const [scannedProduct, setScannedProduct] = useState(null);

  // =============================
  // Cargar productos desde Firebase
  // Tiempo real
  // =============================

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "products"),
      (snapshot) => {
        const productsData = snapshot.docs.map((docItem) => ({
          firebaseId: docItem.id,
          ...docItem.data(),
        }));

        setProducts(
          productsData.sort((a, b) => b.createdAt - a.createdAt)
        );
      }
    );

    return () => unsubscribe();
  }, []);

  // =============================
  // EXPORTAR A EXCEL
  // =============================

  const exportToExcel = () => {
    const data = products.map((product) => ({
      Nombre: product.name,
      Codigo: product.barcode,
      Fecha: new Date(product.createdAt).toLocaleString(),
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Productos"
    );

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const fileData = new Blob([excelBuffer], {
      type:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
    });

    saveAs(fileData, "productos.xlsx");
  };

  // =============================
  // Generar nuevo código de barras
  // =============================

  const generateBarcode = async () => {
    const trimmedName = String(productName || "").trim();

    if (!trimmedName) {
      alert("Debes escribir el nombre del producto");
      return;
    }

    // Genera un código único
    const barcode = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

    try {
      // Guardar en Firebase
      await addDoc(collection(db, "products"), {
        id: barcode,
        category,
        name: trimmedName,
        barcode,
        createdAt: Date.now(),
      });

      setProductName("");
      setCategory("General");
    } catch (error) {
      console.error(error);
      alert("Error guardando producto");
    }
  };

  // =============================
  // Eliminar producto
  // =============================

  const deleteProduct = async (firebaseId) => {
    try {
      await deleteDoc(doc(db, "products", firebaseId));
    } catch (error) {
      console.error(error);
    }
  };

  // =============================
  // Guardar nuevo nombre
  // =============================

  const saveNewName = async () => {
    const trimmedName = newName.trim();

    if (!editingProduct || !trimmedName) {
      return;
    }

    try {
      await updateDoc(doc(db, "products", editingProduct.firebaseId), {
        name: trimmedName,
      });

      setEditingProduct(null);
      setNewName("");
    } catch (error) {
      console.error(error);
    }
  };

  // =============================
  // Cantidad total de productos
  // =============================

  const productCount = useMemo(() => products.length, [products]);

  // =============================
  // DASHBOARD STATS
  // =============================

  const totalCategories = useMemo(() => {
    const categories = new Set(
      products.map((p) => p.category || "General")
    );

    return categories.size;
  }, [products]);

  const latestProduct = useMemo(() => {
    if (products.length === 0) return "Sin productos";

    return products[0]?.name || "Sin productos";
  }, [products]);

  // =============================
  // FILTRAR PRODUCTOS
  // =============================

  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    // Buscar por nombre o código
    filtered = filtered.filter((product) => {
      const text = `${product.name} ${product.barcode} ${product.category || ""}`.toLowerCase();
      return text.includes(searchTerm.toLowerCase());
    });

    // Ordenar
    if (filterType === "recent") {
      filtered.sort((a, b) => b.createdAt - a.createdAt);
    } else if (filterType === "old") {
      filtered.sort((a, b) => a.createdAt - b.createdAt);
    } else if (filterType === "name") {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    }

    return filtered;
  }, [products, searchTerm, filterType]);

  // =============================
  // Render principal
  // =============================

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-gray-900 to-black p-6 text-white">
      <div className="max-w-7xl mx-auto">
        {/* ============================= */}
        {/* HEADER */}
        {/* ============================= */}

        <div className="mb-8">
          <h1 className="text-5xl font-black mb-3 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent tracking-tight">
            Sistema de Código de Barras v 1.0
          </h1>

          <p className="text-gray-300 text-lg">
            Genera, escanea y administra productos fácilmente.
          </p>

          <p className="mt-3 inline-flex items-center gap-2 bg-white/10 border border-white/10 px-4 py-2 rounded-2xl text-sm text-gray-300 backdrop-blur-md">
            Productos registrados: {productCount}
          </p>

          {/* Buscador y filtros */}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-8 mb-8">
            <div className="bg-white/10 border border-white/10 rounded-3xl p-6 backdrop-blur-xl shadow-lg">
              <p className="text-sm text-gray-400 mb-2">
                Total Productos
              </p>

              <h2 className="text-4xl font-black text-cyan-400">
                {productCount}
              </h2>
            </div>

            <div className="bg-white/10 border border-white/10 rounded-3xl p-6 backdrop-blur-xl shadow-lg">
              <p className="text-sm text-gray-400 mb-2">
                Categorías
              </p>

              <h2 className="text-4xl font-black text-purple-400">
                {totalCategories}
              </h2>
            </div>

            <div className="bg-white/10 border border-white/10 rounded-3xl p-6 backdrop-blur-xl shadow-lg overflow-hidden">
              <p className="text-sm text-gray-400 mb-2">
                Último Producto
              </p>

              <h2 className="text-2xl font-bold text-emerald-400 truncate">
                {latestProduct}
              </h2>
            </div>
          </div>

          <div className="mt-6 flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder="Buscar producto o código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 h-14 rounded-2xl border border-white/10 bg-white/10 text-white placeholder-gray-400 px-5 outline-none focus:ring-2 focus:ring-cyan-400 backdrop-blur-md"
            />

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="h-14 rounded-2xl border border-white/10 bg-white/10 text-white px-5 outline-none focus:ring-2 focus:ring-cyan-400 backdrop-blur-md"
            >
              <option value="recent" className="text-black">
                Más recientes
              </option>

              <option value="old" className="text-black">
                Más antiguos
              </option>

              <option value="name" className="text-black">
                Orden alfabético
              </option>
            </select>

            <button
              onClick={exportToExcel}
              className="h-14 px-8 rounded-2xl bg-gradient-to-r from-emerald-400 to-green-500 text-black font-bold shadow-lg shadow-green-500/30 hover:scale-105 transition-all duration-300"
            >
              Exportar Excel
            </button>
          </div>
        </div>

        {/* ============================= */}
        {/* FORMULARIO */}
        {/* ============================= */}

        <div className="bg-white/10 backdrop-blur-xl rounded-[32px] shadow-2xl p-8 mb-8 border border-white/10">
          <h2 className="text-3xl font-bold mb-6 text-white">
            Agregar Producto
          </h2>

          <div className="flex flex-col md:flex-row gap-3">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-14 rounded-2xl border border-white/10 bg-white/10 text-white px-5 outline-none focus:ring-2 focus:ring-cyan-400 backdrop-blur-md"
            >
              <option value="General" className="text-black">General</option>
              <option value="Electrónica" className="text-black">Electrónica</option>
              <option value="Ropa" className="text-black">Ropa</option>
              <option value="Comida" className="text-black">Comida</option>
              <option value="Bebidas" className="text-black">Bebidas</option>
              <option value="Tecnología" className="text-black">Tecnología</option>
            </select>
            <input
              type="text"
              placeholder="Nombre del producto"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  generateBarcode();
                }
              }}
              className="flex-1 h-14 rounded-2xl border border-white/10 bg-white/10 text-white placeholder-gray-400 px-5 outline-none focus:ring-2 focus:ring-cyan-400 backdrop-blur-md"
            />

            <button
              onClick={generateBarcode}
              className="h-14 px-8 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold shadow-lg shadow-cyan-500/30 transition-all duration-300 hover:scale-105"
            >
              Generar Código
            </button>

            <button
              onClick={() => setScannerOpen(true)}
              className="h-14 px-8 rounded-2xl bg-white/10 border border-white/10 text-white font-semibold hover:bg-white/20 transition-all duration-300 hover:scale-105 backdrop-blur-md"
            >
              Escanear
            </button>
          </div>

          {/* Resultado del escaneo */}

          {scanResult && (
            <div className="mt-4 space-y-3">
              <div className="p-4 rounded-2xl bg-green-100 text-green-800 break-all">
                <strong>Código Escaneado:</strong> {scanResult}
              </div>

              {scannedProduct ? (
                <div className="p-4 rounded-2xl bg-white border border-green-200 shadow-sm">
                  <h3 className="text-lg font-semibold text-green-700 mb-2">
                    Producto Encontrado
                  </h3>

                  <p>
                    <strong>Nombre:</strong> {scannedProduct.name}
                  </p>

                  <p className="mt-1 break-all">
                    <strong>Código:</strong> {scannedProduct.barcode}
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-yellow-100 text-yellow-800 border border-yellow-200">
                  No se encontró un producto registrado con este código.
                </div>
              )}
            </div>
          )}
        </div>

        {/* ============================= */}
        {/* LISTA DE PRODUCTOS */}
        {/* ============================= */}

        {products.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-lg p-10 text-center text-gray-500">
            No hay productos registrados todavía.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-8">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.firebaseId}
                product={product}
                onDelete={deleteProduct}
                onEdit={() => {
                  setEditingProduct(product);
                  setNewName(product.name);
                }}
              />
            ))}
          </div>
        )}

        {/* ============================= */}
        {/* MODAL ESCANER */}
        {/* ============================= */}

        {scannerOpen && (
          <Modal onClose={() => setScannerOpen(false)}>
            <h2 className="text-3xl font-bold mb-6 text-white">
              Escanear Código
            </h2>

            <BarcodeScanner
              onScan={(decodedText) => {
                const normalizedCode = String(decodedText)
                  .replace(/\s+/g, "")
                  .trim();

                setScanResult(normalizedCode);

                const foundProduct = products.find((product) => {
                  const savedCode = String(product.barcode)
                    .replace(/\s+/g, "")
                    .trim();

                  return savedCode === normalizedCode;
                });

                setScannedProduct(foundProduct || null);

                if (foundProduct) {
                  alert("Producto encontrado: " + foundProduct.name);
                }

                setScannerOpen(false);
              }}
            />
          </Modal>
        )}

        {/* ============================= */}
        {/* MODAL EDITAR */}
        {/* ============================= */}

        {editingProduct && (
          <Modal onClose={() => setEditingProduct(null)}>
            <h2 className="text-3xl font-bold mb-6 text-white">
              Cambiar Nombre
            </h2>

            <div className="space-y-4">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full h-12 rounded-2xl border border-gray-300 px-4"
              />

              <button
                onClick={saveNewName}
                className="w-full h-12 rounded-2xl bg-black text-white"
              >
                Guardar Cambios
              </button>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}

/*
====================================================
 TARJETA DEL PRODUCTO
====================================================
*/

function ProductCard({ product, onDelete, onEdit }) {
  const svgRef = useRef(null);

  // =============================
  // Generar visual del código
  // =============================

  useEffect(() => {
    if (!svgRef.current) return;

    JsBarcode(svgRef.current, product.barcode, {
      format: "CODE128",
      width: 2,
      height: 90,
      displayValue: true,
      fontSize: 18,
      margin: 15,
      lineColor: "#000000",
    });
  }, [product.barcode]);

  // =============================
  // Descargar código SVG
  // =============================

  const downloadBarcode = () => {
    const svg = svgRef.current;

    if (!svg || typeof window === "undefined") {
      return;
    }

    try {
      const serializer = new XMLSerializer();
      const source = serializer.serializeToString(svg);

      const blob = new Blob([source], {
        type: "image/svg+xml;charset=utf-8",
      });

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `${product.name}.svg`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading barcode:", error);
    }
  };

  // =============================
  // Diseño moderno de tarjeta
  // =============================

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-[32px] shadow-2xl border border-white/10 overflow-hidden hover:scale-[1.02] hover:shadow-cyan-500/20 transition-all duration-300">
      {/* Header */}

      <div className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white p-5">
        <div className="flex justify-between items-start gap-3">
          <div className="min-w-0">
            <h3 className="text-xl font-bold break-words">
              {product.name}
            </h3>

            <div className="flex items-center gap-2 mt-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-semibold">
                {product.category || "General"}
              </span>
            </div>

            <p className="text-sm text-gray-300 mt-1 break-all">
              Código: {product.barcode}
            </p>
          </div>

          {/* Botones */}

          <div className="flex gap-2 shrink-0">
            <button
              onClick={onEdit}
              className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-sm font-semibold backdrop-blur-md transition"
            >
              Editar
            </button>

            <button
              onClick={() => onDelete(product.firebaseId)}
              className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition"
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>

      {/* Código de barras */}

      <div className="p-6">
        <div className="bg-white rounded-3xl p-6 flex justify-center overflow-x-auto shadow-inner">
          <svg ref={svgRef}></svg>
        </div>

        {/* Acciones */}

        <div className="mt-5 flex flex-col gap-3">
          <button
            onClick={downloadBarcode}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold hover:opacity-90 transition-all duration-300 shadow-lg"
          >
            Descargar Código
          </button>

          <div className="bg-white/10 border border-white/10 rounded-2xl p-4 text-center backdrop-blur-md">
            <p className="text-xs text-gray-300">
              Escanea este código desde cualquier dispositivo
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/*
====================================================
 ESCANER
====================================================
*/

function BarcodeScanner({ onScan }) {
  useEffect(() => {
    let scannerInstance;

    scannerInstance = new Html5QrcodeScanner(
      "scanner",
      {
        fps: 10,
        qrbox: 250,
      },
      false
    );

    scannerInstance.render(
      (decodedText) => {
        onScan(decodedText);
      },
      () => {}
    );

    return () => {
      if (scannerInstance) {
        scannerInstance.clear().catch(() => {});
      }
    };
  }, [onScan]);

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-2xl p-4 text-sm">
        Permite acceso a la cámara y apunta al código de barras.
      </div>

      <div id="scanner" className="w-full min-h-[250px]" />
    </div>
  );
}

/*
====================================================
 MODAL
====================================================
*/

function Modal({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-white/10 text-white rounded-[32px] p-8 w-full max-w-md relative shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-2xl"
        >
          ×
        </button>

        {children}
      </div>
    </div>
  );
}
