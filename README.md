# YoRu

Web chỉnh sửa ảnh cơ bản viết bằng Node.js, Express và thư viện Sharp. Đồ án môn học.

## Chức năng

- Upload và quản lý thư viện ảnh cá nhân
- Resize, crop ảnh bằng canvas kéo thả
- Xoay ảnh, lật ngang / lật dọc
- Các bộ lọc màu (đen trắng, sepia, vintage, invert,...)
- Đóng dấu watermark (chọn màu chữ, vị trí)
- Xuất ảnh sang JPEG, PNG, WEBP

## Cách chạy

Cần có sẵn Node.js trên máy:

```bash
git clone https://github.com/sixlonelytears/YoRu.git
cd YoRu
npm install
node server.js
```

Mở trình duyệt vào `http://localhost:3000`.

## Tài khoản test

Lần đầu chạy server sẽ tự tạo sẵn database và tài khoản mẫu:

- Admin: `admin@pictransform.com` | `admin123`
- Member: `member1@test.com` | `member123`

## Chạy test

```bash
node test-suite.js
```
