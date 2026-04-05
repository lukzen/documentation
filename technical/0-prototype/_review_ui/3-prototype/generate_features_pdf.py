#!/usr/bin/env python3
"""Generate a styled PDF from the prototype features list with screenshots."""
import os
from fpdf import FPDF
from PIL import Image as PILImage

FONT_DIR = '/System/Library/Fonts/Supplemental/'
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SCREENSHOTS_DIR = os.path.join(BASE_DIR, 'screenshots')

# Screenshot filenames mapped to keys
SCREEN_SHOTS = {
    1: '01-home-search.png',
    2: '02-search-results.png',
    3: '03-hotel-detail.png',
    4: '04-guest-info.png',
    5: '05a-add-services-top.png',
    '5b': '05b-add-services-vehicles.png',
    6: '06-payment.png',
    7: '07-confirmation.png',
    8: '08-my-bookings.png',
    9: '09-booking-detail.png',
    10: '10-voucher-preview.png',
    11: '11-invoice-preview.png',
    'modify': '12-modify-modal.png',
    'cancel1': '13-cancel-step1.png',
    'cancel2': '14-cancel-step2.png',
}


class FeaturesPDF(FPDF):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.add_font('Arial', '', FONT_DIR + 'Arial Unicode.ttf', uni=True)
        self.add_font('Arial', 'B', FONT_DIR + 'Arial Bold.ttf', uni=True)
        self.add_font('Arial', 'I', FONT_DIR + 'Arial Italic.ttf', uni=True)

    def header(self):
        if self.page_no() == 1:
            return
        self.set_font('Arial', 'I', 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 8, 'Ergos Continental \u2014 Interactive Prototype Features', align='C')
        self.ln(12)

    def footer(self):
        self.set_y(-15)
        self.set_font('Arial', 'I', 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, f'Page {self.page_no()}/{{nb}}', align='C')

    def section_title(self, title):
        self.set_font('Arial', 'B', 16)
        self.set_text_color(26, 26, 78)
        self.cell(0, 10, title)
        self.ln(10)
        self.set_draw_color(13, 148, 136)
        self.set_line_width(0.8)
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.ln(8)

    def screen_heading(self, text):
        self.set_font('Arial', 'B', 12)
        self.set_text_color(13, 148, 136)
        self.cell(0, 7, text)
        self.ln(7)

    def sub_heading(self, text):
        self.set_font('Arial', 'B', 11)
        self.set_text_color(26, 26, 78)
        self.cell(0, 7, text)
        self.ln(6)

    def bullet(self, text):
        self.set_font('Arial', '', 9.5)
        self.set_text_color(60, 60, 60)
        self.cell(6, 5, '\u2022')
        self.multi_cell(self.w - self.l_margin - self.r_margin - 6, 5, text)
        self.ln(1)

    def spacer(self, h=4):
        self.ln(h)

    def add_screenshot(self, key, max_h=150):
        """Add a screenshot image, scaled to fit page width with max height."""
        filename = SCREEN_SHOTS.get(key)
        if not filename:
            return
        path = os.path.join(SCREENSHOTS_DIR, filename)
        if not os.path.exists(path):
            return
        usable_w = self.w - self.l_margin - self.r_margin
        with PILImage.open(path) as img:
            w_px, h_px = img.size
        natural_h = usable_w * (h_px / w_px)
        if natural_h > max_h:
            img_h = max_h
            img_w = img_h * (w_px / h_px)
        else:
            img_h = natural_h
            img_w = usable_w
        x_offset = self.l_margin + (usable_w - img_w) / 2
        self.set_draw_color(200, 200, 200)
        self.set_line_width(0.3)
        img_y = self.get_y()
        self.image(path, x=x_offset, w=img_w, h=img_h)
        self.rect(x_offset, img_y, img_w, img_h)
        self.ln(6)


def _render_screens(pdf, screens, with_screenshots=True, features_label='Features',
                    vehicle_label='Vehicle Selection'):
    """Render screen sections with optional screenshots."""
    for item in screens:
        num, title, bullets = item
        pdf.add_page()
        pdf.screen_heading(title)
        if with_screenshots:
            pdf.add_screenshot(num)
        pdf.sub_heading(features_label)
        for b in bullets:
            pdf.bullet(b)
        pdf.spacer(4)
        # Screen 5 has a second page for the vehicle grid
        if num == 5 and with_screenshots:
            pdf.add_page()
            pdf.screen_heading(title + ' \u2014 ' + vehicle_label)
            pdf.add_screenshot('5b')


def build_pdf():
    pdf = FeaturesPDF('P', 'mm', 'A4')
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(True, margin=20)
    pdf.set_left_margin(18)
    pdf.set_right_margin(18)

    # ── Cover / Title ──
    pdf.add_page()
    pdf.ln(50)
    pdf.set_font('Arial', 'B', 28)
    pdf.set_text_color(26, 26, 78)
    pdf.cell(0, 14, 'Ergos Continental', align='C')
    pdf.ln(12)
    pdf.set_font('Arial', '', 16)
    pdf.set_text_color(13, 148, 136)
    pdf.cell(0, 10, 'Interactive Prototype Features', align='C')
    pdf.ln(16)
    pdf.set_font('Arial', '', 10)
    pdf.set_text_color(120, 120, 120)
    pdf.cell(0, 6, 'Travel Agency Booking Platform', align='C')
    pdf.ln(6)
    pdf.cell(0, 6, 'April 2026', align='C')
    pdf.ln(30)
    pdf.set_draw_color(13, 148, 136)
    pdf.set_line_width(1)
    cx = pdf.w / 2
    pdf.line(cx - 30, pdf.get_y(), cx + 30, pdf.get_y())

    # ══════════════════════════════════
    # ENGLISH
    # ══════════════════════════════════
    screens_en = [
        (1, '1. Home / Search', [
            'Unified search field accepting destination, city, region, or hotel name with autocomplete',
            'Date picker with automatic night count calculation',
            'Multi-room occupancy selector with Adults + Children per room',
            'Trending destinations quick-access chips',
            'Skeleton loading animation during search',
        ]),
        (2, '2. Search Results', [
            'Hotel cards showing meal plan, cancellation policy, and starting price upfront',
            'Sidebar filters: star rating, price range, meal plan, cancellation policy',
            'Sort options (price, rating, name)',
            'Dynamic result count and empty state when filters match nothing',
        ]),
        (3, '3. Hotel Detail', [
            'Dynamic hotel name and star rating based on selected hotel',
            'Photo gallery with grid layout',
            'Hotel description, highlights, and amenities',
            'Review score display',
            'Available rooms with multiple rate options per room type (meal plan + cancellation policy combinations)',
            'Virtual tour button (placeholder)',
        ]),
        (4, '4. Guest Info', [
            'Lead guest form: first name, last name, email',
            'Special requests field',
            'Terms acceptance',
        ]),
        (5, '5. Add Services (Cross-Sell at Checkout)', [
            'Airport transfer cross-sell with auto-filled pickup/drop-off and dates from the hotel booking',
            'Transfer mode selector: One Way / Round Trip',
            'Round trip reveals return date and return time fields',
            'Vehicle search with 6 vehicle options (shuttle, sedan, SUV, van, minibus, luxury)',
            'Vehicle cards showing net price, sell price, capacity, supplier, and refund policy',
            'Sort vehicles by price or capacity',
            'Add/remove transfer with running price update',
            'Markup preview for agency margin',
            'Skip option to proceed without services',
        ]),
        (6, '6. Payment', [
            'Order summary with hotel details and transfer breakdown (when applicable)',
            'Combined "Trip Summary" header when transfer is added',
            'Payment method selection',
            'Price breakdown showing accommodation subtotal + transfer subtotal',
        ]),
        (7, '7. Confirmation', [
            'Dynamic booking reference generation',
            'Confetti celebration animation',
            'Full booking summary with hotel, room, dates, guest, and price',
            'Transfer section with route, vehicle, date/time, and passengers (when applicable)',
            'Price breakdown for combined bookings',
            'Email confirmation button',
            'Direct link to booking details',
        ]),
        (8, '8. My Bookings', [
            'Dynamic booking list that accumulates all confirmed bookings across the session',
            'Each card shows: hotel name, status badge (Confirmed/Cancelled), refund policy, dates, nights, guests, meal plan, price, and booking reference',
            'Combined trip bookings display transfer info',
            'Past bookings persist when new bookings are created',
            'Demo bookings for cancelled booking examples',
            'View Booking Details button per entry',
        ]),
        (9, '9. Booking Detail', [
            'Full booking information: hotel, room, meal plan, dates, duration, price',
            'Transfer section with route, vehicle, date, time, passengers, and price (when applicable)',
            'Price breakdown (accommodation + transfer) for combined bookings',
            'Booking timeline (Confirmed, Modified, Cancelled entries)',
            'Modify Booking and Cancel Booking action buttons',
            'Status badge and cancellation banner',
        ]),
        (10, '10. Voucher Preview', [
            'Printable/downloadable hotel voucher',
            'Transfer details included when applicable',
            'Language switching (English / Spanish)',
            'Combined price summary for trip bookings',
            'Download as PDF button',
        ]),
        (11, '11. Invoice Preview', [
            'Professional invoice layout with line items',
            'Accommodation and transfer as separate line items',
            'Subtotals per service + combined total',
            'Language switching (English / Spanish)',
            'Download as PDF button',
        ]),
    ]

    # Section title page
    pdf.add_page()
    pdf.section_title('Booking Flow (11 Screens)')
    pdf.spacer(2)
    pdf.set_font('Arial', '', 10)
    pdf.set_text_color(80, 80, 80)
    pdf.multi_cell(0, 6, 'Each screen is shown with a screenshot followed by its key features.')
    pdf.spacer(6)

    _render_screens(pdf, screens_en, with_screenshots=True, features_label='Features')

    # ── Modify modal (EN) ──
    pdf.add_page()
    pdf.section_title('Modify Booking Modal')
    pdf.add_screenshot('modify')
    pdf.sub_heading('Features')
    for b in [
        'Change check-in and check-out dates',
        'Multi-room management: add up to 5 rooms, remove rooms, per-room meal plan selection',
        'Transfer modification: change transfer date, pickup time, and passengers',
        'One Way / Round Trip mode toggle with return date/time fields',
        'Read-only vehicle and route info (change requires re-adding from services)',
        'Live total recalculation including transfer price',
        'Changes reflected in booking detail, voucher, invoice, and My Bookings list',
    ]:
        pdf.bullet(b)

    # ── Cancel flow (EN) ──
    pdf.add_page()
    pdf.section_title('Cancel Booking Flow (2-Step)')
    pdf.screen_heading('Step 1: Policy Review')
    pdf.add_screenshot('cancel1')
    pdf.spacer(4)
    pdf.screen_heading('Step 2: Confirm Cancellation')
    pdf.add_screenshot('cancel2')
    pdf.spacer(4)
    pdf.sub_heading('Features')
    for b in [
        'Step 1: Cancellation policy review with tiered penalty timeline, refund calculation, and booking summary',
        'Step 2: Cancellation reason (required), confirmation checkbox, final confirm',
        'Cancelled status reflected across booking detail, My Bookings, and timeline',
    ]:
        pdf.bullet(b)

    # ── Additional features (EN) ──
    pdf.add_page()
    pdf.section_title('Additional Features')
    for b in [
        'Language switching: English/Spanish toggle on vouchers and invoices',
        'Markup settings screen: Configure agency markup percentages',
        'Responsive design: Adapts to different screen sizes',
        'Toast notifications: Success/info/error feedback throughout the flow',
        'Dynamic night calculation: Auto-updates on date changes',
        'Autocomplete search: Destination suggestions with keyboard navigation',
    ]:
        pdf.bullet(b)

    # ══════════════════════════════════
    # SPANISH — Same screenshots, Spanish text
    # ══════════════════════════════════
    screens_es = [
        (1, '1. Inicio / Búsqueda', [
            'Campo de búsqueda unificado que acepta destino, ciudad, región o nombre del hotel con autocompletado',
            'Selector de fechas con cálculo automático del número de noches',
            'Selector de ocupación multi-habitación con Adultos + Niños por habitación',
            'Chips de acceso rápido a destinos populares',
            'Animación de carga tipo skeleton durante la búsqueda',
        ]),
        (2, '2. Resultados de Búsqueda', [
            'Tarjetas de hotel mostrando plan de comidas, política de cancelación y precio desde el inicio',
            'Filtros laterales: categoría de estrellas, rango de precio, plan de comidas, política de cancelación',
            'Opciones de ordenar (precio, puntuación, nombre)',
            'Contador dinámico de resultados y estado vacío cuando los filtros no encuentran coincidencias',
        ]),
        (3, '3. Detalle del Hotel', [
            'Nombre del hotel y categoría de estrellas dinámicos según el hotel seleccionado',
            'Galería de fotos con diseño en cuadrícula',
            'Descripción del hotel, aspectos destacados y servicios',
            'Puntuación de reseñas',
            'Habitaciones disponibles con múltiples opciones de tarifa por tipo de habitación',
            'Botón de tour virtual (placeholder)',
        ]),
        (4, '4. Información del Huésped', [
            'Formulario del huésped principal: nombre, apellido, correo electrónico',
            'Campo de solicitudes especiales',
            'Aceptación de términos',
        ]),
        (5, '5. Agregar Servicios (Venta Cruzada en el Checkout)', [
            'Venta cruzada de transfer aeroportuario con recogida/destino y fechas auto-completados desde la reserva del hotel',
            'Selector de modo de transfer: Solo Ida / Ida y Vuelta',
            'Ida y Vuelta muestra campos de fecha y hora de regreso',
            'Búsqueda de vehículos con 6 opciones (shuttle, sedán, SUV, van, minibús, lujo)',
            'Tarjetas de vehículos mostrando precio neto, precio de venta, capacidad, proveedor y política de reembolso',
            'Ordenar vehículos por precio o capacidad',
            'Agregar/eliminar transfer con actualización de precio en tiempo real',
            'Vista previa del markup para el margen de la agencia',
            'Opción de omitir para continuar sin servicios',
        ]),
        (6, '6. Pago', [
            'Resumen del pedido con detalles del hotel y desglose del transfer (cuando aplica)',
            'Encabezado combinado "Resumen del Viaje" cuando se agrega transfer',
            'Selección de método de pago',
            'Desglose de precios mostrando subtotal de alojamiento + subtotal de transfer',
        ]),
        (7, '7. Confirmación', [
            'Generación dinámica de referencia de reserva',
            'Animación de celebración con confeti',
            'Resumen completo de la reserva con hotel, habitación, fechas, huésped y precio',
            'Sección de transfer con ruta, vehículo, fecha/hora y pasajeros (cuando aplica)',
            'Desglose de precios para reservas combinadas',
            'Botón de confirmación por correo electrónico',
            'Enlace directo a los detalles de la reserva',
        ]),
        (8, '8. Mis Reservas', [
            'Lista dinámica de reservas que acumula todas las reservas confirmadas durante la sesión',
            'Cada tarjeta muestra: nombre del hotel, estado (Confirmada/Cancelada), política de reembolso, fechas, noches, huéspedes, plan de comidas, precio y referencia',
            'Las reservas combinadas (viaje) muestran información del transfer',
            'Las reservas anteriores se conservan al crear nuevas reservas',
            'Reservas demo para ejemplos de reservas canceladas',
            'Botón de Ver Detalles por cada entrada',
        ]),
        (9, '9. Detalle de la Reserva', [
            'Información completa: hotel, habitación, plan de comidas, fechas, duración, precio',
            'Sección de transfer con ruta, vehículo, fecha, hora, pasajeros y precio (cuando aplica)',
            'Desglose de precios (alojamiento + transfer) para reservas combinadas',
            'Línea de tiempo de la reserva (entradas de Confirmada, Modificada, Cancelada)',
            'Botones de acción: Modificar Reserva y Cancelar Reserva',
            'Indicador de estado y banner de cancelación',
        ]),
        (10, '10. Vista Previa del Voucher', [
            'Voucher de hotel imprimible/descargable',
            'Detalles del transfer incluidos cuando aplica',
            'Cambio de idioma (Inglés / Español)',
            'Resumen de precios combinados para reservas de viaje',
            'Botón de descarga en PDF',
        ]),
        (11, '11. Vista Previa de Factura', [
            'Diseño profesional de factura con líneas de detalle',
            'Alojamiento y transfer como partidas separadas',
            'Subtotales por servicio + total combinado',
            'Cambio de idioma (Inglés / Español)',
            'Botón de descarga en PDF',
        ]),
    ]

    pdf.add_page()
    pdf.section_title('Flujo de Reserva (11 Pantallas)')
    pdf.spacer(2)
    pdf.set_font('Arial', '', 10)
    pdf.set_text_color(80, 80, 80)
    pdf.multi_cell(0, 6, 'Cada pantalla se muestra con una captura de pantalla seguida de sus funcionalidades clave.')
    pdf.spacer(6)

    _render_screens(pdf, screens_es, with_screenshots=True, features_label='Funcionalidades',
                    vehicle_label='Selección de Vehículos')

    # ── Modify modal (ES) ──
    pdf.add_page()
    pdf.section_title('Modal de Modificación de Reserva')
    pdf.add_screenshot('modify')
    pdf.sub_heading('Funcionalidades')
    for b in [
        'Cambiar fechas de check-in y check-out',
        'Gestión multi-habitación: agregar hasta 5 habitaciones, eliminar habitaciones, selección de plan de comidas por habitación',
        'Modificación del transfer: cambiar fecha, hora de recogida y pasajeros',
        'Selector de modo Solo Ida / Ida y Vuelta con campos de fecha/hora de regreso',
        'Información de vehículo y ruta de solo lectura (el cambio requiere volver a agregar desde servicios)',
        'Recálculo del total en tiempo real incluyendo precio del transfer',
        'Los cambios se reflejan en el detalle de la reserva, voucher, factura y lista de Mis Reservas',
    ]:
        pdf.bullet(b)

    # ── Cancel flow (ES) ──
    pdf.add_page()
    pdf.section_title('Flujo de Cancelación (2 Pasos)')
    pdf.screen_heading('Paso 1: Revisión de Política')
    pdf.add_screenshot('cancel1')
    pdf.spacer(4)
    pdf.screen_heading('Paso 2: Confirmar Cancelación')
    pdf.add_screenshot('cancel2')
    pdf.spacer(4)
    pdf.sub_heading('Funcionalidades')
    for b in [
        'Paso 1: Revisión de política de cancelación con línea de tiempo de penalidades, cálculo de reembolso y resumen de la reserva',
        'Paso 2: Motivo de cancelación (obligatorio), casilla de confirmación, confirmación final',
        'El estado cancelado se refleja en el detalle de la reserva, Mis Reservas y la línea de tiempo',
    ]:
        pdf.bullet(b)

    # ── Additional features (ES) ──
    pdf.add_page()
    pdf.section_title('Funcionalidades Adicionales')
    for b in [
        'Cambio de idioma: Alternancia Inglés/Español en vouchers y facturas',
        'Pantalla de configuración de markup: Configurar porcentajes de markup de la agencia',
        'Diseño responsivo: Se adapta a diferentes tamaños de pantalla',
        'Notificaciones toast: Retroalimentación de éxito/información/error en todo el flujo',
        'Cálculo dinámico de noches: Se actualiza automáticamente al cambiar fechas',
        'Búsqueda con autocompletado: Sugerencias de destinos con navegación por teclado',
    ]:
        pdf.bullet(b)

    out = os.path.join(BASE_DIR, 'Ergos_Continental_Prototype_Features.pdf')
    pdf.output(out)
    print(f'PDF saved to: {out}')


if __name__ == '__main__':
    build_pdf()
