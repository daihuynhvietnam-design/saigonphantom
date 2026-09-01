const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Cấu hình Database SQLite
const db = new sqlite3.Database('./chat.db', (err) => {
    if (err) console.error('Lỗi kết nối DB', err.message);
    else console.log('Đã kết nối cơ sở dữ liệu SQLite.');
});

// Tạo bảng người dùng nếu chưa có
db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
)`);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// API Đăng ký tài khoản
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Thiếu thông tin!' });

    const hashedPassword = bcrypt.hashSync(password, 8);
    db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [username, hashedPassword], function(err) {
        if (err) {
            return res.status(400).json({ error: 'Tài khoản đã tồn tại!' });
        }
        res.json({ success: true, message: 'Đăng ký thành công!' });
    });
});

// API Đăng nhập
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
        if (err || !user || !bcrypt.compareSync(password, user.password)) {
            return res.status(400).json({ error: 'Sai tài khoản hoặc mật khẩu!' });
        }
        res.json({ success: true, username: user.username });
    });
});

// Xử lý chat realtime bằng Socket.IO
io.on('connection', (socket) => {
    console.log('Một người dùng đã kết nối');

    socket.on('join_room', (data) => {
        socket.join('secret_group');
    });

    socket.on('send_message', (data) => {
        io.to('secret_group').emit('receive_message', data);
    });

    socket.on('disconnect', () => {
        console.log('Người dùng đã ngắt kết nối');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server đang chạy tại: http://localhost:${PORT}`);
});
