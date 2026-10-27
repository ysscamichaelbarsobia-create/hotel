// ====================== FIREBASE CONFIG ======================
const firebaseConfig = {
    apiKey: "AIzaSyBSugWLvzPvyu1SaGwRwiqGhQjTrOn4Fzk",
    authDomain: "hotel-fc394.firebaseapp.com",
    projectId: "hotel-fc394",
    storageBucket: "hotel-fc394.firebasestorage.app",
    messagingSenderId: "1046892949077",
    appId: "1:1046892949077:web:708a0a2f1bdcc1a3d52edc"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ====================== HELPERS ======================
function showAlert(message, type = "danger") {
    const box = document.getElementById("alertBox");
    if (!box) return;
    box.innerHTML = `
        <div class="alert alert-${type} py-2 small rounded-3">
            <i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'} me-1"></i> ${message}
        </div>`;
}

function showAuthCard() {
    document.getElementById("welcomeScreen").style.opacity = "0";
    document.getElementById("welcomeScreen").style.transform = "translateY(-20px)";
    setTimeout(() => {
        document.getElementById("welcomeScreen").style.display = "none";
        document.getElementById("authContainer").classList.add("show");
    }, 300);
}

function hideAuthCard() {
    document.getElementById("authContainer").classList.remove("show");
    setTimeout(() => {
        document.getElementById("welcomeScreen").style.display = "block";
        document.getElementById("welcomeScreen").style.opacity = "1";
        document.getElementById("welcomeScreen").style.transform = "translateY(0)";
    }, 300);
}

function logout() {
    localStorage.removeItem("user");
    window.location.href = "index.html";
}

function getCurrentUser() {
    return JSON.parse(localStorage.getItem("user") || "null");
}

function requireLogin() {
    if (!getCurrentUser()) {
        window.location.href = "index.html";
    }
}

// ====================== LOGIN / SIGNUP ======================
document.addEventListener("DOMContentLoaded", () => {
    // If already logged in and on login page → go to dashboard
    if (window.location.pathname.includes("index.html") || window.location.pathname.endsWith("/") || window.location.pathname.endsWith("/hotel-booking/")) {
        if (getCurrentUser()) {
            window.location.href = "dashboard.html";
            return;
        }
    }

    // Login form
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const username = document.getElementById("loginUsername").value.trim();
            const password = document.getElementById("loginPassword").value.trim();

            try {
                const snapshot = await db.collection("users")
                    .where("username", "==", username)
                    .where("password", "==", password)
                    .get();

                if (snapshot.empty) {
                    showAlert("Invalid Username or Password!");
                    return;
                }

                const user = snapshot.docs[0].data();
                localStorage.setItem("user", JSON.stringify({
                    username: user.username,
                    role: user.role || "Guest",
                    id: snapshot.docs[0].id
                }));
                window.location.href = "dashboard.html";
            } catch (error) {
                console.error(error);
                showAlert("Login error. Please check your connection.");
            }
        });
    }

    // Signup form
    const signupForm = document.getElementById("signupForm");
    if (signupForm) {
        signupForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const username = document.getElementById("newUsername").value.trim();
            const email = document.getElementById("newEmail").value.trim();
            const phone = document.getElementById("newPhone").value.trim();
            const password = document.getElementById("newPassword").value.trim();
            const confirm = document.getElementById("confirmPassword").value.trim();

            if (!phone.match(/^\d{11}$/)) {
                showAlert("Phone number must be exactly 11 digits.");
                return;
            }
            if (!email.includes("@")) {
                showAlert("Email must contain @.");
                return;
            }
            if (password !== confirm) {
                showAlert("Passwords do not match!");
                return;
            }

            try {
                const exists = await db.collection("users").where("username", "==", username).get();
                if (!exists.empty) {
                    showAlert("Username already taken.");
                    return;
                }

                await db.collection("users").add({
                    username, email, phone, password, role: "Guest"
                });
                await db.collection("guests").add({
                    name: username, email, phone
                });

                showAlert("Account created successfully! You can now login.", "success");
                document.getElementById("signupForm").reset();
            } catch (error) {
                console.error(error);
                showAlert("Signup error. Please try again.");
            }
        });
    }

    // Seed default admin & staff if not exist
    seedDefaultAccounts();

    // Dashboard page
    if (window.location.pathname.includes("dashboard.html")) {
        requireLogin();
        initDashboard();
    }
});

async function seedDefaultAccounts() {
    const defaults = [
        { username: "admin", password: "password123", role: "Admin" },
        { username: "staff", password: "password123", role: "Staff" }
    ];
    for (const u of defaults) {
        const snap = await db.collection("users").where("username", "==", u.username).get();
        if (snap.empty) {
            await db.collection("users").add(u);
        }
    }
}

// ====================== DASHBOARD ======================
async function initDashboard() {
    const user = getCurrentUser();
    document.getElementById("displayUsername").textContent = user.username;
    document.getElementById("displayRole").textContent = user.role;

    // Build menu
    let menus = [];
    if (user.role === "Admin") {
        menus = ["Guest Directory", "User Management"];
    } else if (user.role === "Staff") {
        menus = ["Room Inventory", "Bookings"];
    } else {
        menus = ["Room Inventory", "Bookings"];
    }

    const menuList = document.getElementById("menuList");
    menuList.innerHTML = menus.map(m => `
        <a href="#" class="list-group-item list-group-item-action py-2.5" onclick="loadMenu('${m}'); return false;">
            ${getMenuIcon(m)} ${m}
        </a>
    `).join("");

    // Default menu
    loadMenu(menus[0]);
}

function getMenuIcon(m) {
    if (m === "Room Inventory") return '<i class="fa-solid fa-door-open me-2"></i>';
    if (m === "Bookings") return '<i class="fa-solid fa-calendar-check me-2"></i>';
    if (m === "Guest Directory") return '<i class="fa-solid fa-users me-2"></i>';
    if (m === "User Management") return '<i class="fa-solid fa-user-gear me-2"></i>';
    return '';
}

async function loadMenu(menu) {
    // Update active menu
    document.querySelectorAll("#menuList a").forEach(a => a.classList.remove("active"));
    if (event && event.target) {
        event.target.closest("a")?.classList.add("active");
    }

    const content = document.getElementById("mainContent");
    content.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-primary"></div><p class="mt-3 text-muted">Loading...</p></div>`;

    if (menu === "Room Inventory") await renderRoomInventory();
    else if (menu === "Bookings") await renderBookings();
    else if (menu === "Guest Directory") await renderGuestDirectory();
    else if (menu === "User Management") await renderUserManagement();
}

// ====================== ROOM INVENTORY ======================
async function renderRoomInventory() {
    const user = getCurrentUser();
    const roomsSnap = await db.collection("rooms").get();
    const rooms = roomsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    let html = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
                <h2><i class="fa-solid fa-bed me-2 text-primary"></i> Room Inventory</h2>
                <p class="text-muted mb-0">Browse rooms with capacity and GCash numbers.</p>
            </div>
        </div>
    `;

    if (["Admin", "Staff"].includes(user.role)) {
        html += `
            <div class="card card-form mb-4 p-4">
                <h5 class="mb-3 fw-bold"><i class="fa-solid fa-circle-plus text-success me-2"></i> Add New Room</h5>
                <form id="addRoomForm" class="row g-3">
                    <div class="col-md-6">
                        <label class="form-label fw-semibold">Room Number</label>
                        <input type="text" class="form-control" id="roomNumber" required>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label fw-semibold">Room Type</label>
                        <select class="form-select" id="roomType">
                            <option value="Single Deluxe">Single Deluxe (1 to 2 pax)</option>
                            <option value="Double Suite">Double Suite (2 to 5 pax)</option>
                            <option value="Penthouse">Penthouse (5 to 8 pax)</option>
                            <option value="Family Room">Family Room (8 to 15 pax)</option>
                        </select>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label fw-semibold">Price per Night (₱)</label>
                        <input type="number" step="0.01" class="form-control" id="roomPrice" value="1200" required>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label fw-semibold">GCash Number</label>
                        <input type="text" class="form-control" id="gcashNumber" placeholder="09123456789" required>
                    </div>
                    <div class="col-12">
                        <button type="submit" class="btn btn-custom"><i class="fa-solid fa-floppy-disk me-1"></i> Save Room</button>
                    </div>
                </form>
            </div>
        `;
    }

    // Metrics
    const available = rooms.filter(r => r.status === "Available").length;
    const occupied = rooms.filter(r => r.status === "Occupied").length;

    html += `
        <div class="row mb-4">
            <div class="col-md-4"><div class="metric-card"><h6 class="text-muted">Total Rooms</h6><h3 class="fw-bold">${rooms.length}</h3></div></div>
            <div class="col-md-4"><div class="metric-card"><h6 class="text-muted text-success">Available</h6><h3 class="fw-bold text-success">${available}</h3></div></div>
            <div class="col-md-4"><div class="metric-card"><h6 class="text-muted text-danger">Occupied</h6><h3 class="fw-bold text-danger">${occupied}</h3></div></div>
        </div>
        <div class="row" id="roomsGrid">
    `;

    rooms.forEach(room => {
        html += `
            <div class="col-md-4 mb-4">
                <div class="card h-100 shadow-sm border-0 rounded-4 overflow-hidden">
                    <img src="${room.roomImage || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80'}" class="room-img">
                    <div class="card-body d-flex flex-column">
                        <div class="d-flex justify-content-between mb-2">
                            <h5 class="fw-bold mb-0">Room ${room.roomNumber}</h5>
                            <span class="badge ${room.status === 'Available' ? 'bg-success' : room.status === 'Occupied' ? 'bg-danger' : 'bg-warning text-dark'}">${room.status}</span>
                        </div>
                        <p class="text-muted small mb-1"><i class="fa-solid fa-tag me-1"></i> ${room.roomType}</p>
                        <p class="text-primary small fw-semibold mb-1"><i class="fa-solid fa-users me-1"></i> ${room.pax || '1 to 2 pax'}</p>
                        <p class="text-secondary small mb-2"><i class="fa-solid fa-wallet me-1"></i> GCash: <strong>${room.gcashNumber || '09123456789'}</strong></p>
                        <h5 class="text-success fw-bold mb-3">₱${Number(room.price).toFixed(2)} <span class="small text-muted">/ night</span></h5>
                        ${["Admin", "Staff"].includes(user.role) ? `
                            <div class="mt-auto d-flex gap-2">
                                <button class="btn btn-sm btn-outline-dark flex-grow-1" onclick="toggleRoom('${room.id}')">
                                    <i class="fa-solid fa-rotate me-1"></i> Toggle
                                </button>
                                <button class="btn btn-sm btn-danger" onclick="deleteRoom('${room.id}')">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </div>
                        ` : ""}
                    </div>
                </div>
            </div>
        `;
    });

    html += `</div>`;
    document.getElementById("mainContent").innerHTML = html;

    // Add Room form
    const form = document.getElementById("addRoomForm");
    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const type = document.getElementById("roomType").value;
            const paxMap = {
                "Single Deluxe": "1 to 2 pax",
                "Double Suite": "2 to 5 pax",
                "Penthouse": "5 to 8 pax",
                "Family Room": "8 to 15 pax"
            };
            await db.collection("rooms").add({
                roomNumber: document.getElementById("roomNumber").value.trim(),
                roomType: type,
                pax: paxMap[type],
                price: parseFloat(document.getElementById("roomPrice").value),
                gcashNumber: document.getElementById("gcashNumber").value.trim(),
                status: "Available",
                roomImage: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80"
            });
            loadMenu("Room Inventory");
        });
    }
}

async function toggleRoom(id) {
    const doc = await db.collection("rooms").doc(id).get();
    const status = doc.data().status;
    const next = status === "Available" ? "Occupied" : status === "Occupied" ? "Maintenance" : "Available";
    await db.collection("rooms").doc(id).update({ status: next });
    loadMenu("Room Inventory");
}

async function deleteRoom(id) {
    if (confirm("Delete this room?")) {
        await db.collection("rooms").doc(id).delete();
        loadMenu("Room Inventory");
    }
}

// ====================== BOOKINGS ======================
async function renderBookings() {
    const user = getCurrentUser();
    const bookingsSnap = await db.collection("bookings").get();
    const roomsSnap = await db.collection("rooms").get();
    const rooms = roomsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const bookings = bookingsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    let html = `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <div>
                <h2><i class="fa-solid fa-book-bookmark me-2 text-primary"></i> Room Bookings</h2>
                <p class="text-muted">Manage bookings and payment verification.</p>
            </div>
        </div>
        <div class="card card-form mb-4 p-4">
    `;

    if (["Admin", "Staff"].includes(user.role)) {
        html += `
            <h5 class="mb-3 fw-bold"><i class="fa-solid fa-cash-register text-success me-2"></i> Walk-In Booking</h5>
            <form id="walkInForm">
                <div class="mb-3">
                    <label class="form-label fw-semibold">Guest Name</label>
                    <input type="text" class="form-control" id="walkInName" required>
                </div>
                <div class="mb-3">
                    <label class="form-label fw-semibold">Select Room</label>
                    <select class="form-select" id="walkInRoom" required>
                        ${rooms.filter(r => r.status === "Available").map(r => 
                            `<option value="${r.id}">Room ${r.roomNumber} - ${r.roomType} - ₱${r.price}/night</option>`
                        ).join("") || '<option disabled selected>No available rooms</option>'}
                    </select>
                </div>
                <div class="row mb-3">
                    <div class="col-md-6">
                        <label class="form-label fw-semibold">Check-in</label>
                        <input type="date" class="form-control" id="walkInCheckIn" required>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label fw-semibold">Check-out</label>
                        <input type="date" class="form-control" id="walkInCheckOut" required>
                    </div>
                </div>
                <button type="submit" class="btn btn-custom">Register Walk-In Booking</button>
            </form>
        `;
    } else {
        html += `
            <h5 class="mb-3 fw-bold"><i class="fa-solid fa-calendar-plus text-success me-2"></i> Reserve a Room</h5>
            <form id="guestBookingForm">
                <div class="mb-3">
                    <label class="form-label fw-semibold">Select Room</label>
                    <select class="form-select" id="guestRoom" required>
                        ${rooms.filter(r => r.status === "Available").map(r => 
                            `<option value="${r.id}">Room ${r.roomNumber} - ${r.roomType} - ₱${r.price}/night</option>`
                        ).join("") || '<option disabled selected>No available rooms</option>'}
                    </select>
                </div>
                <div class="row mb-4">
                    <div class="col-md-6">
                        <label class="form-label fw-semibold">Check-in</label>
                        <input type="date" class="form-control" id="guestCheckIn" required>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label fw-semibold">Check-out</label>
                        <input type="date" class="form-control" id="guestCheckOut" required>
                    </div>
                </div>
                <div class="alert alert-warning small">A 20% down payment is required.</div>
                <button type="submit" class="btn btn-custom">Confirm Booking & Generate E-Receipt</button>
            </form>
        `;
    }

    html += `</div><h4 class="mt-4 fw-bold"><i class="fa-solid fa-list-check me-2"></i> Active Reservations</h4>`;

    if (bookings.length === 0) {
        html += `<div class="alert alert-info">No active bookings found.</div>`;
    } else {
        bookings.forEach(b => {
            html += `
                <div class="bg-white p-4 mb-3 border rounded-4 shadow-sm">
                    <div class="row align-items-center">
                        <div class="col-md-3">
                            <strong>Guest:</strong> ${b.guestName}<br>
                            <strong>Room:</strong> ${b.roomNumber}
                        </div>
                        <div class="col-md-2">${b.checkIn} to ${b.checkOut}</div>
                        <div class="col-md-3">
                            <span class="text-success fw-bold">Downpayment: ₱${Number(b.downPayment || 0).toFixed(2)}</span><br>
                            <span class="text-danger small">Balance: ₱${Number(b.balanceDue || 0).toFixed(2)}</span><br>
                            <span class="badge ${b.status.includes('Confirmed') ? 'bg-success' : b.status.includes('Pending') ? 'bg-warning text-dark' : 'bg-secondary'} mt-1">${b.status}</span>
                        </div>
                        <div class="col-md-4 text-end">
                            ${renderBookingActions(b, user)}
                        </div>
                    </div>
                </div>
            `;
        });
    }

    document.getElementById("mainContent").innerHTML = html;

    // Form handlers
    const walkInForm = document.getElementById("walkInForm");
    if (walkInForm) {
        walkInForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            await createBooking({
                guestName: document.getElementById("walkInName").value,
                roomId: document.getElementById("walkInRoom").value,
                checkIn: document.getElementById("walkInCheckIn").value,
                checkOut: document.getElementById("walkInCheckOut").value,
                isWalkIn: true
            });
        });
    }

    const guestForm = document.getElementById("guestBookingForm");
    if (guestForm) {
        guestForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            await createBooking({
                guestName: user.username,
                roomId: document.getElementById("guestRoom").value,
                checkIn: document.getElementById("guestCheckIn").value,
                checkOut: document.getElementById("guestCheckOut").value,
                isWalkIn: false
            });
        });
    }
}

function renderBookingActions(b, user) {
    if (["Admin", "Staff"].includes(user.role)) {
        if (b.status === "Pending Verification") {
            return `
                <button class="btn btn-sm btn-success me-1" onclick="confirmPayment('${b.id}', '${b.roomId}')"><i class="fa-solid fa-check"></i></button>
                <button class="btn btn-sm btn-danger" onclick="declinePayment('${b.id}', '${b.roomId}')"><i class="fa-solid fa-xmark"></i></button>
            `;
        }
        if (b.status.includes("Confirmed")) {
            return `<button class="btn btn-sm btn-success" onclick="checkoutBooking('${b.id}', '${b.roomId}')">Collect Balance & Checkout</button>`;
        }
        return `<span class="text-muted small">Awaiting payment</span>`;
    } else {
        if (b.status === "Pending Payment" && b.guestName === user.username) {
            return `<button class="btn btn-sm btn-primary" onclick="showEReceipt('${b.id}')">View E-Receipt & Pay</button>`;
        }
        if (b.status === "Pending Verification") {
            return `<span class="badge bg-warning text-dark">Under review</span>`;
        }
        if (b.status.includes("Confirmed")) {
            return `<span class="badge bg-success">Confirmed</span>`;
        }
        return "";
    }
}

async function createBooking({ guestName, roomId, checkIn, checkOut, isWalkIn }) {
    const roomDoc = await db.collection("rooms").doc(roomId).get();
    const room = roomDoc.data();
    const d1 = new Date(checkIn);
    const d2 = new Date(checkOut);
    const nights = Math.max(Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24)), 1);
    const total = room.price * nights;
    const down = total * 0.20;
    const balance = total - down;

    const data = {
        guestName,
        roomId,
        roomNumber: room.roomNumber,
        checkIn,
        checkOut,
        totalPrice: total,
        downPayment: down,
        balanceDue: balance,
        gcashNumber: room.gcashNumber || "09123456789",
        paymentImage: "",
        status: isWalkIn ? "Confirmed (Walk-In)" : "Pending Payment"
    };

    const ref = await db.collection("bookings").add(data);

    if (isWalkIn) {
        await db.collection("rooms").doc(roomId).update({ status: "Occupied" });
        loadMenu("Bookings");
    } else {
        showEReceipt(ref.id);
    }
}

async function showEReceipt(bookingId) {
    const doc = await db.collection("bookings").doc(bookingId).get();
    const b = { id: doc.id, ...doc.data() };

    document.getElementById("mainContent").innerHTML = `
        <div class="row justify-content-center">
            <div class="col-md-8">
                <div class="card card-form p-4 p-md-5 border shadow">
                    <div class="text-center mb-4">
                        <div class="bg-dark text-white rounded-circle d-inline-flex align-items-center justify-content-center mb-2" style="width:60px;height:60px;">
                            <i class="fa-solid fa-receipt fa-lg"></i>
                        </div>
                        <h3 class="fw-bold">Official E-Receipt</h3>
                    </div>
                    <div class="bg-light p-4 rounded-4 mb-4 border">
                        <div class="row mb-2"><div class="col-6 text-muted">Guest:</div><div class="col-6 text-end fw-semibold">${b.guestName}</div></div>
                        <div class="row mb-2"><div class="col-6 text-muted">Room:</div><div class="col-6 text-end fw-semibold">Room ${b.roomNumber}</div></div>
                        <div class="row mb-2"><div class="col-6 text-muted">Dates:</div><div class="col-6 text-end fw-semibold">${b.checkIn} to ${b.checkOut}</div></div>
                        <hr>
                        <div class="row mb-2"><div class="col-6 text-muted">Total:</div><div class="col-6 text-end fw-semibold">₱${Number(b.totalPrice).toFixed(2)}</div></div>
                        <div class="row mb-2 text-success"><div class="col-6 fw-bold">Down Payment (20%):</div><div class="col-6 text-end fw-bold">₱${Number(b.downPayment).toFixed(2)}</div></div>
                        <div class="row text-danger"><div class="col-6">Balance Due:</div><div class="col-6 text-end">₱${Number(b.balanceDue).toFixed(2)}</div></div>
                    </div>
                    ${b.status === "Pending Payment" ? `
                        <div class="alert alert-info">
                            <h6 class="fw-bold">GCash Payment</h6>
                            <p class="mb-1">Send ₱${Number(b.downPayment).toFixed(2)} to:</p>
                            <h4 class="text-primary fw-bold">${b.gcashNumber}</h4>
                        </div>
                        <button class="btn btn-custom w-100 mb-2" onclick="submitPayment('${b.id}')">
                            <i class="fa-solid fa-paper-plane me-1"></i> I Already Paid (Submit for Verification)
                        </button>
                        <button class="btn btn-outline-danger w-100 btn-sm" onclick="cancelBooking('${b.id}', '${b.roomId}')">Cancel Booking</button>
                    ` : `
                        <div class="alert alert-warning text-center">
                            <i class="fa-solid fa-clock fa-2x mb-2"></i>
                            <h5>Payment under review</h5>
                            <button class="btn btn-custom btn-sm mt-2" onclick="loadMenu('Bookings')">Back to Bookings</button>
                        </div>
                    `}
                </div>
            </div>
        </div>
    `;
}

async function submitPayment(id) {
    await db.collection("bookings").doc(id).update({ status: "Pending Verification" });
    loadMenu("Bookings");
}

async function cancelBooking(id, roomId) {
    await db.collection("bookings").doc(id).delete();
    await db.collection("rooms").doc(roomId).update({ status: "Available" });
    loadMenu("Bookings");
}

async function confirmPayment(id, roomId) {
    await db.collection("bookings").doc(id).update({ status: "Confirmed (Paid)" });
    await db.collection("rooms").doc(roomId).update({ status: "Occupied" });
    loadMenu("Bookings");
}

async function declinePayment(id, roomId) {
    await db.collection("bookings").doc(id).delete();
    await db.collection("rooms").doc(roomId).update({ status: "Available" });
    loadMenu("Bookings");
}

async function checkoutBooking(id, roomId) {
    await db.collection("bookings").doc(id).delete();
    await db.collection("rooms").doc(roomId).update({ status: "Available" });
    loadMenu("Bookings");
}

// ====================== GUEST DIRECTORY (Admin) ======================
async function renderGuestDirectory() {
    const snap = await db.collection("guests").get();
    const guests = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    let html = `
        <h2><i class="fa-solid fa-address-book me-2 text-primary"></i> Guest Directory</h2>
        <p class="text-muted">Manage registered guests.</p>
        <table class="table table-hover bg-white border shadow-sm rounded-4 overflow-hidden">
            <thead class="table-dark"><tr><th>Name</th><th>Email</th><th>Phone</th><th>Actions</th></tr></thead>
            <tbody>
    `;

    guests.forEach(g => {
        html += `
            <tr>
                <td>${g.name}</td>
                <td>${g.email}</td>
                <td>${g.phone}</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="deleteGuest('${g.id}')">Delete</button>
                </td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    document.getElementById("mainContent").innerHTML = html;
}

async function deleteGuest(id) {
    if (confirm("Delete this guest?")) {
        await db.collection("guests").doc(id).delete();
        loadMenu("Guest Directory");
    }
}

// ====================== USER MANAGEMENT (Admin) ======================
async function renderUserManagement() {
    const snap = await db.collection("users").get();
    const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    let html = `
        <h2><i class="fa-solid fa-users-gear me-2 text-primary"></i> User & Staff Accounts</h2>
        <div class="card card-form mb-4 p-4">
            <h5 class="mb-3 fw-bold">Add Admin or Staff</h5>
            <form id="addUserForm">
                <div class="mb-3"><label class="form-label">Username</label><input type="text" class="form-control" id="newUserName" required></div>
                <div class="mb-3"><label class="form-label">Password</label><input type="password" class="form-control" id="newUserPass" required></div>
                <div class="mb-3">
                    <label class="form-label">Role</label>
                    <select class="form-select" id="newUserRole">
                        <option>Admin</option>
                        <option>Staff</option>
                    </select>
                </div>
                <button type="submit" class="btn btn-custom">Create Account</button>
            </form>
        </div>
        <table class="table table-hover bg-white border shadow-sm">
            <thead class="table-dark"><tr><th>Username</th><th>Role</th><th>Actions</th></tr></thead>
            <tbody>
    `;

    users.forEach(u => {
        html += `
            <tr>
                <td>${u.username}</td>
                <td><span class="badge bg-secondary">${u.role}</span></td>
                <td><button class="btn btn-sm btn-danger" onclick="deleteUser('${u.id}')">Delete</button></td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    document.getElementById("mainContent").innerHTML = html;

    document.getElementById("addUserForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        await db.collection("users").add({
            username: document.getElementById("newUserName").value,
            password: document.getElementById("newUserPass").value,
            role: document.getElementById("newUserRole").value
        });
        loadMenu("User Management");
    });
}

async function deleteUser(id) {
    if (confirm("Delete this user?")) {
        await db.collection("users").doc(id).delete();
        loadMenu("User Management");
    }
}