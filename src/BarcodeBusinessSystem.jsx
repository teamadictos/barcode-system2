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

    // Código único
    const barcode =
      `${Date.now()}${Math.floor(Math.random() * 1000)}`;

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

    if (!editingProduct || !trimmedName) {
      return;
    }

    try {

      await updateDoc(
        doc(db, "products", editingProduct.firebaseId),
        {
          name: trimmedName,
        }
      );

      setEditingProduct(null);
      setNewName("");

    } catch (error) {

      console.error(error);
    }
  };

  // =============================
  // TOTAL PRODUCTOS
  // =============================

  const productCount = useMemo(
    () => products.length,
    [products]
  );

  // =============================
  // RENDER
  // =============================

  return (
    <div className="min-h-screen bg-gray-100 p-6">

      <div className="max-w-7xl mx-auto">

        {/* HEADER */}

        <div className="mb-8">

          <h1 className="text-4xl font-bold mb-2">
            Sistema de Código de Barras v 1.0
          </h1>

          <p className="text-gray-600">
            Genera, escanea y administra productos fácilmente.
          </p>

          <p className="mt-2 text-sm text-gray-500">
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
              onChange={(e) =>
                setProductName(e.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  generateBarcode();
                }
              }}
              className="flex-1 h-12 rounded-2xl border border-gray-300 px-4 outline-none focus:ring-2 focus:ring-black"
            />

            <button
              onClick={generateBarcode}
              className="h-12 px-6 rounded-2xl bg-black text-white font-medium hover:opacity-90 transition"
            >
              Generar Código
            </button>

            <button
              onClick={() => setScannerOpen(true)}
              className="h-12 px-6 rounded-2xl bg-gray-200 font-medium hover:bg-gray-300 transition"
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

                const normalizedCode =
                  String(decodedText)
                    .replace(/\s+/g, "")
                    .trim();

                setScanResult(normalizedCode);

                const foundProduct =
                  products.find((product) => {

                    const savedCode =
                      String(product.barcode)
                        .replace(/\s+/g, "")
                        .trim();

                    return savedCode === normalizedCode;
                  });

                setScannedProduct(foundProduct || null);

                if (foundProduct) {
                  alert(
                    "Producto encontrado: " +
                    foundProduct.name
                  );
                }

                setScannerOpen(false);
              }}
            />

          </Modal>

        )}

        {/* MODAL EDITAR */}

        {editingProduct && (

        <Modal
          onClose={() =>
            setEditingProduct(null)
          }
        >

          <h2 className="text-3xl font-bold mb-5">
            Editar Producto
          </h2>

          <div className="space-y-4">

            <input
              type="text"
              value={newName}
              onChange={(e) =>
                setNewName(e.target.value)
              }
              className="
                w-full
                h-14
                rounded-2xl
                border
                border-gray-200
                bg-gray-50
                px-5
                outline-none
                focus:ring-4
                focus:ring-blue-100
              "
            />

            <button
              onClick={saveNewName}
              className="
                w-full
                h-14
                rounded-2xl
                bg-blue-600
                hover:bg-blue-700
                text-white
                font-semibold
              "
            >
              Guardar Cambios
            </button>

          </div>

        </Modal>

      )}

    </div>

  </div>
);

/*
====================================================
 TARJETA PRODUCTO
====================================================
*/

function ProductCard({
  product,
  onDelete,
  onEdit,
}) {

  const svgRef = useRef(null);

  // GENERAR VISUAL CÓDIGO

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

  // DESCARGAR SVG

  const downloadBarcode = () => {

    const svg = svgRef.current;

    if (!svg || typeof window === "undefined") {
      return;
    }

    try {

      const serializer = new XMLSerializer();

      const source =
        serializer.serializeToString(svg);

      const blob = new Blob([source], {
        type: "image/svg+xml;charset=utf-8",
      });

      const url =
        window.URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = url;

      link.download =
        `${product.name}.svg`;

      document.body.appendChild(link);

      link.click();

      document.body.removeChild(link);

      window.URL.revokeObjectURL(url);

    } catch (error) {

      console.error(error);
    }
  };

  return (

    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-300">

      {/* HEADER */}

      <div className="bg-gradient-to-r from-black to-gray-800 text-white p-4">

        <div className="flex justify-between items-start gap-3">

          <div className="min-w-0">

            <h3 className="text-xl font-bold break-words">
              {product.name}
            </h3>

            <p className="text-sm text-gray-300 mt-1 break-all">
              Código: {product.barcode}
            </p>

          </div>

          {/* BOTONES */}

          <div className="flex gap-2 shrink-0">

            <button
              onClick={onEdit}
              className="px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-sm"
            >
              Editar
            </button>

            <button
              onClick={() =>
                onDelete(product.firebaseId)
              }
              className="px-3 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm"
            >
              Eliminar
            </button>

          </div>

        </div>

      </div>

      {/* CÓDIGO */}

      <div className="p-6">

        <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-6 flex justify-center overflow-x-auto">

          <svg ref={svgRef}></svg>

        </div>

        {/* DESCARGA */}

      <div className="mt-6 space-y-3">

             <button
          onClick={downloadBarcode}
          className="
            w-full
            h-14
            rounded-2xl
            bg-gray-900
            hover:bg-black
            text-white
            font-semibold
            transition
          "
        >
          Descargar Código
        </button>

          <div className="bg-gray-50 rounded-2xl p-3 text-center">

            <p className="text-xs text-gray-500">
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

    scannerInstance =
      new Html5QrcodeScanner(
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

        scannerInstance
          .clear()
          .catch(() => {});
      }
    };

  }, [onScan]);

  return (

    <div className="space-y-4">

      <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-2xl p-4 text-sm">

        Permite acceso a la cámara y apunta al código de barras.

      </div>

      <div
        id="scanner"
        className="w-full min-h-[250px]"
      />

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

    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">

      <div className="bg-white rounded-3xl p-6 w-full max-w-md relative shadow-2xl">

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