import React, { useEffect, useMemo, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import { Html5QrcodeScanner } from "html5-qrcode";

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
*/

export default function BarcodeBusinessSystem() {

  // =============================
  // ESTADOS
  // =============================
  const [products, setProducts] = useState([]);
  const [productName, setProductName] = useState("");
  const [editingProduct, setEditingProduct] = useState(null);
  const [newName, setNewName] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanResult, setScanResult] = useState("");
  const [scannedProduct, setScannedProduct] = useState(null);

  // =============================
  // CARGAR PRODUCTOS FIREBASE
  // =============================
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "products"),
      (snapshot) => {
        const productsData = snapshot.docs.map((docItem) => ({
          firebaseId: docItem.id,
          ...docItem.data(),
        }));
        setProducts(productsData);
      }
    );
    return () => unsubscribe();
  }, []);

  // =============================
  // GENERAR CÓDIGO
  // =============================
  const generateBarcode = async () => {
    const trimmedName = String(productName || "").trim();
    if (!trimmedName) {
      alert("Debes escribir el nombre del producto");
      return;
    }

    const barcode = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

    try {
      await addDoc(collection(db, "products"), {
        id: barcode,
        name: trimmedName,
        barcode,
        createdAt: Date.now(),
      });
      setProductName("");
    } catch (error) {
      console.error(error);
      alert("Error guardando producto");
    }
  };

  // =============================
  // ELIMINAR PRODUCTO
  // =============================
  const deleteProduct = async (firebaseId) => {
    try {
      await deleteDoc(doc(db, "products", firebaseId));
    } catch (error) {
      console.error(error);
    }
  };

  // =============================
  // EDITAR PRODUCTO
  // =============================
  const saveNewName = async () => {
    const trimmedName = newName.trim();
    if (!editingProduct || !trimmedName) return;

    try {
      await updateDoc(
        doc(db, "products", editingProduct.firebaseId),
        { name: trimmedName }
      );
      setEditingProduct(null);
      setNewName("");
    } catch (error) {
      console.error(error);
    }
  };

  const productCount = useMemo(() => products.length, [products]);

  return (
    <div className="min-h-screen bg-gray-100 p-6 text-gray-800 antialiased">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 tracking-tight">
            Sistema de Código de Barras v 1.0
          </h1>
          <p className="text-gray-600">
            Genera, escanea y administra productos fácilmente.
          </p>
          <p className="mt-2 text-sm text-gray-500 font-medium">
            Productos registrados: {productCount}
          </p>
        </div>

        {/* FORMULARIO */}
        <div className="bg-white rounded-3xl shadow-lg p-6 mb-8 border border-gray-100">
          <h2 className="text-2xl font-semibold mb-4">
            Agregar Producto
          </h2>

          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              placeholder="Nombre del producto"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") generateBarcode();
              }}
              className="flex-1 h-12 rounded-2xl border border-gray-300 px-4 outline-none focus:ring-2 focus:ring-black transition"
            />

            {/* BOTÓN PRINCIPAL: NEGRO PREMIUM */}
            <button
              onClick={generateBarcode}
              className="h-12 px-6 rounded-2xl bg-gradient-to-b from-gray-900 to-black text-white font-medium shadow-md shadow-black/10 hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
            >
              Generar Código
            </button>

            {/* BOTÓN SECUNDARIO: ESCANEAR */}
            <button
              onClick={() => setScannerOpen(true)}
              className="h-12 px-6 rounded-2xl bg-gray-100 text-gray-700 font-medium border border-gray-200 hover:bg-gray-200 hover:text-black hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
            >
              Escanear
            </button>
          </div>

          {/* RESULTADO ESCANEO */}
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
                  <p><strong>Nombre:</strong> {scannedProduct.name}</p>
                  <p className="mt-1 break-all"><strong>Código:</strong> {scannedProduct.barcode}</p>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-yellow-100 text-yellow-800 border border-yellow-200">
                  No se encontró un producto registrado con este código.
                </div>
              )}
            </div>
          )}
        </div>

        {/* PRODUCTOS */}
        {products.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-lg p-10 text-center text-gray-500">
            No hay productos registrados todavía.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {products.map((product) => (
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

        {/* MODAL ESCANER */}
        {scannerOpen && (
          <Modal onClose={() => setScannerOpen(false)}>
            <h2 className="text-2xl font-semibold mb-4">
              Escanear Código
            </h2>
            <BarcodeScanner
              onScan={(decodedText) => {
                const normalizedCode = String(decodedText).replace(/\s+/g, "").trim();
                setScanResult(normalizedCode);

                const foundProduct = products.find((product) => {
                  const savedCode = String(product.barcode).replace(/\s+/g, "").trim();
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

        {/* MODAL EDITAR */}
        {editingProduct && (
          <Modal onClose={() => setEditingProduct(null)}>
            <h2 className="text-2xl font-semibold mb-4">
              Cambiar Nombre
            </h2>
            <div className="space-y-4">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full h-12 rounded-2xl border border-gray-300 px-4 outline-none focus:ring-2 focus:ring-black"
              />
              {/* BOTÓN GUARDAR MODAL */}
              <button
                onClick={saveNewName}
                className="w-full h-12 rounded-2xl bg-gradient-to-b from-gray-900 to-black text-white font-semibold shadow-md hover:shadow-lg active:scale-[0.98] transition-all duration-200"
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
 TARJETA PRODUCTO
====================================================
*/
function ProductCard({ product, onDelete, onEdit }) {
  const svgRef = useRef(null);

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

  const downloadBarcode = () => {
    const svg = svgRef.current;
    if (!svg || typeof window === "undefined") return;

    try {
      const serializer = new XMLSerializer();
      const source = serializer.serializeToString(svg);
      const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${product.name}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-300 flex flex-col justify-between">
      
      {/* HEADER TARJETA */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-5">
        <div className="flex justify-between items-start gap-3">
          <div className="min-w-0">
            <h3 className="text-xl font-bold break-words tracking-tight">
              {product.name}
            </h3>
            <p className="text-xs text-gray-400 mt-1 break-all font-mono">
              ID: {product.barcode}
            </p>
          </div>

          {/* ACCIONES DE LA TARJETA */}
          <div className="flex gap-1.5 shrink-0">
            <button
              onClick={onEdit}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium backdrop-blur-md active:scale-95 transition-all duration-150 border border-white/5"
            >
              Editar
            </button>
            <button
              onClick={() => onDelete(product.firebaseId)}
              className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white text-xs font-medium active:scale-95 transition-all duration-150 border border-red-500/20"
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>

      {/* CUERPO CÓDIGO */}
      <div className="p-6 content-end">
        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-4 flex justify-center overflow-x-auto JSON-shadow-inner">
          <svg ref={svgRef}></svg>
        </div>

        {/* BOTÓN DESCARGAR */}
        <div className="mt-5 space-y-3">
          <button
            onClick={downloadBarcode}
            className="w-full h-12 rounded-2xl bg-white text-gray-900 font-semibold border-2 border-gray-900 hover:bg-gray-900 hover:text-white hover:shadow-md active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2"
          >
            {/* Pequeño icono minimalista de descarga */}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16v1a3 3 0 003 3h12a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Descargar Código
          </button>

          <div className="bg-gray-50 rounded-xl p-2.5 text-center border border-gray-100">
            <p className="text-[11px] text-gray-400 font-medium">
              Formato SVG vectorial de alta resolución
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
    let scannerInstance = new Html5QrcodeScanner("scanner", { fps: 10, qrbox: 250 }, false);
    scannerInstance.render((decodedText) => onScan(decodedText), () => {});

    return () => {
      if (scannerInstance) {
        scannerInstance.clear().catch(() => {});
      }
    };
  }, [onScan]);

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-100 text-blue-800 rounded-2xl p-4 text-sm">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-3xl p-6 w-full max-w-md relative shadow-2xl border border-gray-100 animate-scale-up">
        {/* BOTÓN CERRAR MODAL */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-black transition duration-150 text-xl font-medium"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
}