import json
import os
import random
import re
from datetime import datetime

from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
ORDERS_FILE = os.path.join(DATA_DIR, "orders.json")

FREE_SHIPPING_FROM = 60.0
SHIPPING_COST = 4.95

PRODUCTS = [
    {
        "id": 1,
        "name": "Camiseta Arena",
        "category": "Hombre",
        "price": 24.90,
        "old_price": None,
        "tag": "Nuevo",
        "icon": "tshirt",
        "color": "#B4552F",
        "bg": ["#EFE4D6", "#E2D0BC"],
        "colors": ["#B4552F", "#1C1A17", "#EDE6DA"],
        "sizes": ["S", "M", "L", "XL"],
        "desc": "Camiseta oversize de algodón orgánico peinado. Cuello reforzado, hombros caídos y una caída fluida que mejora con cada lavado.",
    },
    {
        "id": 2,
        "name": "Hoodie Nórdico",
        "category": "Hombre",
        "price": 59.90,
        "old_price": 74.90,
        "tag": "Oferta",
        "icon": "hoodie",
        "color": "#5A5F43",
        "bg": ["#EDE6D8", "#DCD0BB"],
        "colors": ["#5A5F43", "#2E3328", "#D8CDBB"],
        "sizes": ["S", "M", "L", "XL"],
        "desc": "Sudadera con capucha de algodón reciclado y felpa cepillada. Bolsillo canguro, cordones de algodón y puños elásticos.",
    },
    {
        "id": 3,
        "name": "Chaqueta Vintage",
        "category": "Mujer",
        "price": 79.90,
        "old_price": None,
        "tag": "Nuevo",
        "icon": "jacket",
        "color": "#4E6A82",
        "bg": ["#E9E2D6", "#D5C9B6"],
        "colors": ["#4E6A82", "#9AA9B5", "#2C3440"],
        "sizes": ["XS", "S", "M", "L"],
        "desc": "Chaqueta de denim rígido con lavado vintage. Corte ligeramente holgado, botones metálicos y bolsillos de plastrón.",
    },
    {
        "id": 4,
        "name": "Vestido Oliva",
        "category": "Mujer",
        "price": 69.90,
        "old_price": None,
        "tag": "Nuevo",
        "icon": "dress",
        "color": "#7A6B45",
        "bg": ["#F0E7DA", "#E2D3C0"],
        "colors": ["#7A6B45", "#A3614E", "#1C1A17"],
        "sizes": ["XS", "S", "M", "L"],
        "desc": "Vestido midi de viscosa fluida con escote redondo y falda evasé. Tan cómodo que querrás llevarlo de lunes a domingo.",
    },
    {
        "id": 5,
        "name": "Pantalón Utility",
        "category": "Hombre",
        "price": 54.90,
        "old_price": 64.90,
        "tag": "Oferta",
        "icon": "pants",
        "color": "#6B5B45",
        "bg": ["#ECE4D6", "#DCCFBD"],
        "colors": ["#6B5B45", "#3A3B32", "#B9A98F"],
        "sizes": ["S", "M", "L", "XL"],
        "desc": "Pantalón cargo de sarga de algodón con bolsillos laterales y bajo ajustable. Recto, resistente y sin esfuerzo.",
    },
    {
        "id": 6,
        "name": "Camisa Brisa",
        "category": "Hombre",
        "price": 44.90,
        "old_price": None,
        "tag": "Nuevo",
        "icon": "shirt",
        "color": "#8A9B8B",
        "bg": ["#EFE9DD", "#E0D6C5"],
        "colors": ["#8A9B8B", "#E7E0D2", "#4E6A82"],
        "sizes": ["S", "M", "L", "XL"],
        "desc": "Camisa de lino y algodón con cuello clásico y bolsillo en el pecho. Ligera, transpirable y perfecta para capas.",
    },
    {
        "id": 7,
        "name": "Falda Sena",
        "category": "Mujer",
        "price": 39.90,
        "old_price": None,
        "tag": "Nuevo",
        "icon": "skirt",
        "color": "#A3614E",
        "bg": ["#F1E6DA", "#E4D2C0"],
        "colors": ["#A3614E", "#6B5B45", "#1C1A17"],
        "sizes": ["XS", "S", "M", "L"],
        "desc": "Falda plisada de largo midi con cintura elástica. Movimiento ligero y un color que combina con absolutamente todo.",
    },
    {
        "id": 8,
        "name": "Gorra Logo",
        "category": "Accesorios",
        "price": 19.90,
        "old_price": None,
        "tag": "Nuevo",
        "icon": "cap",
        "color": "#2E3A34",
        "bg": ["#EAE1D3", "#D9CBB6"],
        "colors": ["#2E3A34", "#B4552F", "#D8CDBB"],
        "sizes": ["Única"],
        "desc": "Gorra de sarga de algodón con bordado discreto. Visera curva, cierre ajustable y estructura que aguanta el uso.",
    },
    {
        "id": 9,
        "name": "Bolso Lino",
        "category": "Accesorios",
        "price": 29.90,
        "old_price": None,
        "tag": "Nuevo",
        "icon": "tote",
        "color": "#A98C63",
        "bg": ["#F0E9DC", "#E1D4BF"],
        "colors": ["#A98C63", "#5A5F43", "#1C1A17"],
        "sizes": ["Única"],
        "desc": "Tote bag de lino grueso con asas reforzadas y bolsillo interior. Cabe el portátil, la compra o los planes improvisados.",
    },
]

CATEGORIES = ["Todos", "Mujer", "Hombre", "Accesorios"]

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
ZIP_RE = re.compile(r"^\d{5}$")


def find_product(product_id):
    for product in PRODUCTS:
        if product["id"] == product_id:
            return product
    return None


def save_order(order):
    os.makedirs(DATA_DIR, exist_ok=True)
    orders = []
    if os.path.exists(ORDERS_FILE):
        try:
            with open(ORDERS_FILE, "r", encoding="utf-8") as file:
                orders = json.load(file)
        except (json.JSONDecodeError, OSError):
            orders = []
    orders.append(order)
    with open(ORDERS_FILE, "w", encoding="utf-8") as file:
        json.dump(orders, file, ensure_ascii=False, indent=2)


@app.route("/")
def index():
    return render_template(
        "index.html",
        products=PRODUCTS,
        categories=CATEGORIES,
        year=datetime.now().year,
        free_shipping_from=FREE_SHIPPING_FROM,
    )


@app.get("/api/products")
def api_products():
    return jsonify(products=PRODUCTS)


@app.post("/api/checkout")
def checkout():
    payload = request.get_json(silent=True) or {}
    customer = payload.get("customer") or {}
    items = payload.get("items") or []

    name = str(customer.get("name") or "").strip()
    email = str(customer.get("email") or "").strip()
    address = str(customer.get("address") or "").strip()
    city = str(customer.get("city") or "").strip()
    zip_code = str(customer.get("zip") or "").strip()

    errors = {}
    if len(name) < 2:
        errors["name"] = "Escribe tu nombre completo."
    if not EMAIL_RE.match(email):
        errors["email"] = "Introduce un email válido."
    if len(address) < 5:
        errors["address"] = "La dirección es demasiado corta."
    if len(city) < 2:
        errors["city"] = "Indica tu ciudad."
    if not ZIP_RE.match(zip_code):
        errors["zip"] = "El código postal debe tener 5 dígitos."

    order_items = []
    subtotal = 0.0
    for item in items:
        try:
            product_id = int(item.get("id"))
            quantity = int(item.get("qty"))
        except (TypeError, ValueError):
            continue

        product = find_product(product_id)
        if product is None or quantity < 1 or quantity > 10:
            continue

        size = str(item.get("size") or "")
        if size not in product["sizes"]:
            size = product["sizes"][0]

        line_total = round(product["price"] * quantity, 2)
        subtotal = round(subtotal + line_total, 2)
        order_items.append(
            {
                "id": product["id"],
                "name": product["name"],
                "size": size,
                "qty": quantity,
                "unit_price": product["price"],
                "line_total": line_total,
            }
        )

    if not order_items:
        errors["items"] = "Tu cesta está vacía o los productos no son válidos."

    if errors:
        return jsonify(ok=False, errors=errors), 400

    shipping = 0.0 if subtotal >= FREE_SHIPPING_FROM else SHIPPING_COST
    total = round(subtotal + shipping, 2)
    order_id = "NZ-{}-{}".format(
        datetime.now().strftime("%y%m%d"),
        "".join(random.choices("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", k=4)),
    )

    order = {
        "id": order_id,
        "created_at": datetime.now().isoformat(timespec="seconds"),
        "customer": {
            "name": name,
            "email": email,
            "address": address,
            "city": city,
            "zip": zip_code,
        },
        "items": order_items,
        "subtotal": subtotal,
        "shipping": shipping,
        "total": total,
    }

    try:
        save_order(order)
    except OSError:
        pass

    return jsonify(
        ok=True,
        order={
            "id": order_id,
            "subtotal": subtotal,
            "shipping": shipping,
            "total": total,
            "items": len(order_items),
        },
    )


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
