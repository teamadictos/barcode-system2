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
*/

export default function BarcodeBusinessSystem() {

  // =============================
  // ESTADOS
  // =============================

  const [products, setProducts] = useState([]);
  const [productName, setProductName] = useState("");
  // =============================
// BUSCADOR
// =============================


  const [editingProduct, setEditingProduct] = useState(null);
  const [newName, setNewName] = useState("");

  const [scannerOpen, setScannerOpen] = useState(false);

  const [scanResult, setScanResult] = useState("");
  const [scannedProduct, setScannedProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // =============================
  // CARGAR PRODUCTOS FIREBASE
  // =============================

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "products"),
      (snapshot) => {

        const productsData = snapshot.docs
  .map((docItem) => ({
    firebaseId: docItem.id,
    ...docItem.data(),
  }))
  .sort((a, b) => b.createdAt - a.createdAt);

        setProducts(productsData);
      }
    );

    return () => unsubscribe();
  }, []);

// =============================
// EXPORTAR PRODUCTOS A EXCEL
// =============================

const exportToExcel = () => {

  const data = products.map((product) => ({
    Nombre: product.name,
    Codigo: product.barcode,
    Fecha: new Date(
      product.createdAt
    ).toLocaleString(),
  }));

  const worksheet =
    XLSX.utils.json_to_sheet(data);

  const workbook =
    XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Productos"
  );

  const excelBuffer =
    XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

  const fileData = new Blob(
    [excelBuffer],
    {
      type:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
    }
  );

  saveAs(fileData, "productos.xlsx");
};

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
// BUSCADOR
// =============================

const [searchTerm, setSearchTerm] = useState("");

  // =============================
  // TOTAL PRODUCTOS
  // =============================

  const productCount = useMemo(
    () => products.length,
    [products]
  );

  // =============================
// FILTRAR PRODUCTOS
// =============================

const filteredProducts = useMemo(() => {

  return products.filter((product) => {

    const name =
      String(product.name || "")
        .toLowerCase();

    const barcode =
      String(product.barcode || "")
        .toLowerCase();

    const search =
      searchTerm.toLowerCase();

    return (
      name.includes(search) ||
      barcode.includes(search)
    );
  });

}, [products, searchTerm]);

  // =============================
  // RENDER
  // =============================

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 p-6">

      <div className="max-w-7xl mx-auto">

        {/* HEADER */}

       <div className="mb-10">

  <div className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-xl rounded-[30px] p-8">

    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">

      <div>

        <h1 className="text-5xl font-black bg-gradient-to-r from-indigo-700 to-blue-500 bg-clip-text text-transparent mb-3">
          Barcode System
        </h1>

        <p className="text-slate-600 text-lg">
          Genera, escanea y administra productos fácilmente.
        </p>

      </div>

      <div className="bg-gradient-to-r from-indigo-600 to-blue-500 text-white px-6 py-4 rounded-3xl shadow-lg">

        <p className="text-sm opacity-80">
          Productos Registrados
        </p>


        <h2 className="text-3xl font-bold">
          {productCount}
        </h2>

 {/* ============================= */}
{/* BUSCADOR EN TIEMPO REAL */}
{/* ============================= */}

<div className="mt-6">

  <input
    type="text"
    placeholder="Buscar producto o código..."
    value={searchTerm}
    onChange={(e) =>
      setSearchTerm(e.target.value)
    }
    className="
      w-full
      md:w-[450px]
      h-14
      rounded-2xl
      bg-white/10
      border
      border-white/10
      backdrop-blur-xl
      px-5
      text-white
      placeholder-gray-400
      outline-none
      focus:ring-2
      focus:ring-cyan-400
      shadow-lg
    "
  />

</div>

      </div>
       <div className="mt-5">
  <button
    onClick={exportToExcel}
    className="
      h-10
      px-8
      rounded-2xl
      bg-gradient-to-r
      from-green-400
      to-emerald-500
      text-black
      font-bold
      shadow-lg
      shadow-green-500/30
      hover:scale-105
      hover:opacity-90
      transition-all
      duration-300
    "
  >
    Exportar Excel
  </button>
</div>

    </div>

  </div>

</div>

        {/* FORMULARIO */}

        <div className="bg-white/80 backdrop-blur-xl rounded-[30px] shadow-2xl p-8 mb-10 border border-white/50">

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

            <h2 className="text-2xl font-semibold mb-4">
              Cambiar Nombre
            </h2>

            <div className="space-y-4">

              <input
                type="text"
                value={newName}
                onChange={(e) =>
                  setNewName(e.target.value)
                }
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

<div className="bg-white/90 backdrop-blur-xl rounded-[32px] shadow-xl border border-white/50 overflow-hidden hover:-translate-y-1 hover:shadow-2xl transition-all duration-300">
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

        <div className="mt-5 flex flex-col gap-3">

          <button
            onClick={downloadBarcode}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-700 text-white font-bold hover:scale-[1.02] shadow-lg transition-all duration-300"
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
