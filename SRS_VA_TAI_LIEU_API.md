# TÀI LIỆU YÊU CẦU HỆ THỐNG (URD & SRS) VÀ TÀI LIỆU API
## Hệ thống: PicTransform Studio (Hệ thống Xử lý & Biến đổi Hình ảnh Trực tuyến)

---

# PHẦN 1: TÀI LIỆU YÊU CẦU NGƯỜI DÙNG (URD)

## 1.1. Bối cảnh & Mục tiêu
* **Bối cảnh:** Nhu cầu biên tập, tối ưu hóa kích thước và đóng dấu bản quyền hình ảnh phục vụ các nền tảng mạng xã hội, sàn thương mại điện tử ngày càng phổ biến.
* **Mục tiêu:** Cung cấp một nền tảng xử lý hình ảnh trực tuyến nhẹ nhàng, nhanh chóng, cho phép người dùng thay đổi kích thước, cắt cúp, xoay/lật, áp bộ lọc màu, đóng dấu watermark và chuyển đổi định dạng ảnh linh hoạt ngay trên trình duyệt web.

## 1.2. Mô tả các vai trò người dùng (Roles)
1. **Khách vãng lai (Guest):** Người dùng chưa có tài khoản, được phép truy cập trang chủ giới thiệu, xem hướng dẫn sử dụng và thực hiện đăng ký tài khoản mới.
2. **Thành viên (Member):** Người dùng đã đăng nhập hệ thống, sở hữu kho lưu trữ ảnh cá nhân (thư viện), có quyền tải ảnh lên, xem chi tiết metadata, chỉnh sửa hình ảnh bằng các công cụ biến đổi và tải ảnh thành phẩm về máy tính.
3. **Quản trị viên (Admin):** Người quản lý vận hành hệ thống, có quyền xem báo cáo thống kê tài nguyên (tổng user, tổng ảnh, tổng dung lượng lưu trữ), xem danh sách tài khoản thành viên và có quyền xóa bất kỳ hình ảnh nào vi phạm quy định.

## 1.3. User Stories & Tiêu chí nghiệm thu (Acceptance Criteria)
* **US-01 (Độ ưu tiên: Cao):** Là một *Khách vãng lai*, tôi muốn đăng ký tài khoản bằng email và mật khẩu để tôi có thể sử dụng đầy đủ các tính năng lưu trữ và biên tập ảnh.
  * *Tiêu chí nghiệm thu:* Email hợp lệ, mật khẩu tối thiểu 6 ký tự; hệ thống thông báo thành công và chuyển hướng đến trang thư viện.
* **US-02 (Độ ưu tiên: Cao):** Là một *Thành viên*, tôi muốn tải lên các bức ảnh (JPG, PNG, WebP) tối đa 10MB để lưu trữ trong kho ảnh cá nhân của tôi.
  * *Tiêu chí nghiệm thu:* Ảnh tải lên hiển thị ngay trong danh sách thư viện kèm thumbnail và dung lượng chính xác.
* **US-03 (Độ ưu tiên: Cao):** Là một *Thành viên*, tôi muốn thay đổi kích thước (Resize) ảnh với tùy chọn giữ nguyên tỉ lệ hoặc tự do để phù hợp với kích thước đăng web.
  * *Tiêu chí nghiệm thu:* Nhập width/height hợp lệ, ảnh xuất ra hiển thị xem trước đúng kích thước đã nhập.
* **US-04 (Độ ưu tiên: Trung bình):** Là một *Thành viên*, tôi muốn chèn chữ bản quyền (Watermark) vào ảnh với màu sắc và vị trí tùy chọn để bảo vệ quyền tác giả.
  * *Tiêu chí nghiệm thu:* Chữ hiển thị rõ nét trên ảnh tại vị trí đã chọn (dưới phải, trên trái, giữa...).
* **US-05 (Độ ưu tiên: Trung bình):** Là một *Quản trị viên*, tôi muốn xem tổng quan thống kê hệ thống để nắm được mức độ tiêu thụ dung lượng đĩa cứng.
  * *Tiêu chí nghiệm thu:* Dashboard hiển thị số lượng người dùng, tổng số ảnh và tổng số byte lưu trữ.

---

# PHẦN 2: ĐẶC TẢ YÊU CẦU PHẦN MỀM (SRS)

## 2.1. Yêu cầu Chức năng (Functional Requirements - 15 FRs)
* `FR-01`: **Đăng ký tài khoản** — Hệ thống cho phép người dùng đăng ký tài khoản với email hợp lệ và mật khẩu tối thiểu 6 ký tự. Trả về mã lỗi 400 nếu dữ liệu không hợp lệ, 409 nếu email đã tồn tại.
* `FR-02`: **Đăng nhập & Xác thực** — Xác thực người dùng bằng email và mật khẩu, cấp phát JSON Web Token (JWT) có thời hạn 24 giờ.
* `FR-03`: **Tải ảnh lên (Upload)** — Tiếp nhận file ảnh định dạng JPEG, PNG, WEBP với dung lượng tối đa 10MB. Kiểm tra tính hợp lệ của ảnh và lưu thông số width, height, size vào cơ sở dữ liệu.
* `FR-04`: **Thư viện ảnh cá nhân (Gallery)** — Trả về danh sách ảnh thuộc quyền sở hữu của người dùng đăng nhập với phân trang (mặc định 12 ảnh/trang), kèm đường dẫn ảnh thu nhỏ (thumbnail).
* `FR-05`: **Xem chi tiết ảnh** — Hiển thị chi tiết metadata của ảnh (tên file gốc, kích thước pixel width x height, dung lượng file, định dạng MIME, thời gian tải lên).
* `FR-06`: **Thay đổi kích thước (Resize)** — Thay đổi kích thước ảnh theo chiều rộng (width) và chiều cao (height) lớn hơn 0. Hỗ trợ tùy chọn giữ nguyên tỉ lệ co giãn (keepAspectRatio).
* `FR-07`: **Cắt cúp ảnh (Crop)** — Cắt xén hình ảnh theo vùng chữ nhật xác định bởi tọa độ điểm gốc (x, y) và kích thước (width, height).
* `FR-08`: **Xoay ảnh (Rotate)** — Cho phép xoay ảnh theo các góc 90°, 180°, 270° theo chiều kim đồng hồ.
* `FR-09`: **Lật ảnh (Flip)** — Cho phép lật ảnh theo chiều ngang (flip horizontal) hoặc chiều dọc (flip vertical).
* `FR-10`: **Bộ lọc màu sắc (Filter)** — Áp dụng các hiệu ứng xử lý điểm ảnh gồm: Đen trắng (Grayscale), Cổ điển (Sepia) và Làm mờ (Blur).
* `FR-11`: **Chèn Watermark** — Chèn chuỗi ký tự bản quyền với màu sắc tùy chọn vào một trong 5 vị trí: Trên-Trái, Trên-Phải, Dưới-Trái, Dưới-Phải, Giữa.
* `FR-12`: **Xuất & Tải về (Export)** — Chuyển đổi ảnh thành phẩm sang các định dạng JPG, PNG, WEBP với thanh điều chỉnh chất lượng nén từ 1% đến 100%.
* `FR-13`: **Xóa ảnh cá nhân** — Cho phép người dùng xóa ảnh khỏi thư viện kèm xóa file vật lý trên đĩa cứng. Yêu cầu xác nhận trước khi xóa.
* `FR-14`: **Đổi mật khẩu** — Người dùng đã đăng nhập có thể đổi mật khẩu mới bằng cách xác nhận mật khẩu hiện tại. Mật khẩu mới tối thiểu 6 ký tự.
* `FR-15`: **Quản trị hệ thống (Admin)** — Quản trị viên có quyền xem danh sách toàn bộ người dùng, xem tổng dung lượng ổ đĩa đã sử dụng và có quyền xóa bất kỳ ảnh nào trên hệ thống.

---

## 2.2. Ba Luồng nghiệp vụ hoàn chỉnh (Complete Workflows)

### FLOW-01: Đăng ký $\to$ Đăng nhập $\to$ Đổi mật khẩu
* **Luồng chính (Main Flow):**
  1. Người dùng truy cập trang chủ, chọn tab "Đăng ký", nhập email hợp lệ và mật khẩu "member123" ($\ge 6$ ký tự).
  2. Hệ thống kiểm tra hợp lệ, mã hóa mật khẩu bằng bcrypt, tạo bản ghi trong DB và cấp phát JWT.
  3. Người dùng đăng nhập vào hệ thống, mở modal "Đổi mật khẩu", nhập mật khẩu cũ và mật khẩu mới $\ge 6$ ký tự.
  4. Hệ thống cập nhật mật khẩu mới và thông báo thành công.
* **Luồng thay thế (Alternative Flow):** Người dùng đã có tài khoản trực tiếp nhập email/mật khẩu tại tab "Đăng nhập" để vào thẳng Thư viện ảnh.
* **Luồng ngoại lệ (Exception Flow):** Người dùng nhập mật khẩu hiện tại không chính xác khi đổi mật khẩu; hệ thống trả mã 401 và giữ nguyên mật khẩu cũ.

### FLOW-02: Tải ảnh lên $\to$ Quản lý kho ảnh $\to$ Xóa ảnh
* **Luồng chính (Main Flow):**
  1. Thành viên chọn file ảnh JPG 2MB từ máy tính, bấm nút "Tải lên".
  2. Hệ thống kiểm tra dung lượng $\le 10$MB, kiểm tra mimetype hợp lệ, lưu file vào thư mục `uploads/`, ghi bản ghi vào cơ sở dữ liệu.
  3. Ảnh mới xuất hiện đầu danh sách thư viện. Người dùng bấm xem chi tiết, hệ thống hiển thị modal thông số metadata.
  4. Người dùng bấm nút "Xóa", xác nhận trên modal, hệ thống xóa file và bản ghi.
* **Luồng thay thế (Alternative Flow):** Ảnh có kích thước nhỏ được tải lên tức thì mà không cần hiển thị loading quá 1 giây.
* **Luồng ngoại lệ (Exception Flow):** File tải lên vượt quá 10MB; hệ thống từ chối và báo lỗi HTTP 400.

### FLOW-03: Chọn ảnh $\to$ Biên tập (Resize, Filter, Watermark) $\to$ Xuất file
* **Luồng chính (Main Flow):**
  1. Thành viên bấm "Sửa" tại một ảnh trong thư viện, chuyển hướng sang màn hình Editor.
  2. Người dùng nhập kích thước Resize 800x600, bấm Áp dụng. Ảnh xem trước cập nhật tức thì.
  3. Người dùng áp dụng tiếp bộ lọc Grayscale và chèn Text Watermark "PicTransform".
  4. Người dùng mở mục Xuất & Tải về, chọn định dạng WEBP, chất lượng 85%, bấm "Tải ảnh về". Trình duyệt tải file thành phẩm về máy.
* **Luồng thay thế (Alternative Flow):** Người dùng chỉ thực hiện xoay ảnh 90° và tải về trực tiếp mà không cần qua bước watermark.
* **Luồng ngoại lệ (Exception Flow):** Người dùng nhập kích thước width $\le 0$; hệ thống báo lỗi không hợp lệ.

---

## 2.3. Yêu cầu Phi chức năng (8 NFRs có con số đo lường)

* `NFR-01` (Hiệu năng): Các API biến đổi hình ảnh (Resize, Crop, Rotate, Filter...) với file ảnh kích thước $\le 5$MB phải có thời gian phản hồi trung bình $\le 2.0$ giây trong điều kiện tải 10 người dùng đồng thời.
* `NFR-02` (Hiệu năng): Hệ thống phải có khả năng xử lý ổn định với thông lượng tối thiểu $\ge 15$ requests/giây với tỉ lệ lỗi (Error rate) $< 2.0\%$.
* `NFR-03` (Hiệu năng): Thời gian tải trang Thư viện ảnh (bao gồm tải danh sách 12 ảnh thu nhỏ) phải $\le 2.5$ giây trên kết nối mạng băng thông rộng tiêu chuẩn.
* `NFR-04` (Khả dụng & Responsive): Giao diện web phải tương thích và hiển thị đầy đủ các thành phần điều khiển trên màn hình có chiều rộng từ $360$px trở lên (mobile, tablet, desktop) mà không có phần tử nào bị đè lấp, che khuất.
* `NFR-05` (Tính nhất quán giao diện): Tất cả các nút bấm trong cùng một nhóm thao tác (Button Group) phải có kích thước đồng đều và căn thẳng hàng nhau.
* `NFR-06` (Bản địa hóa & Nội dung): Toàn bộ văn bản giao diện hiển thị tiếng Việt có dấu chuẩn chính tả, không trộn lẫn từ ngữ tiếng Anh trong cùng một thành phần.
* `NFR-07` (Bảo mật): Mật khẩu người dùng phải được mã hóa bằng thuật toán băm an toàn (bcrypt với cost factor 10). Mọi API yêu cầu xác thực phải được bảo vệ bằng JSON Web Token (JWT) chữ ký bí mật.
* `NFR-08` (Toàn vẹn dữ liệu): Khóa ngoại giữa bảng `images` và `users` phải được kích hoạt tính năng cascade, đảm bảo khi xóa người dùng thì toàn bộ dữ liệu ảnh liên quan không bị phân mảnh.

---

## 2.4. Ma trận phân quyền (Permission Matrix)

| Chức năng / API | Khách (Guest) | Thành viên (Member) | Quản trị viên (Admin) |
| :--- | :---: | :---: | :---: |
| Đăng ký / Đăng nhập (`/api/auth/*`) | Cho phép | Cho phép | Cho phép |
| Đổi mật khẩu cá nhân | Từ chối (401) | Cho phép | Cho phép |
| Tải ảnh lên (`POST /api/images/upload`) | Từ chối (401) | Cho phép | Cho phép |
| Xem thư viện ảnh cá nhân | Từ chối (401) | Cho phép (Ảnh của mình) | Cho phép |
| Biến đổi ảnh (Resize, Crop, Filter...) | Từ chối (401) | Cho phép (Ảnh của mình) | Cho phép |
| Xóa ảnh của chính mình | Từ chối (401) | Cho phép | Cho phép |
| Xóa ảnh của người khác | Từ chối (401) | **Từ chối (403)** | **Cho phép** |
| Xem danh sách người dùng (`/api/admin/users`)| Từ chối (401) | Từ chối (403) | Cho phép |
| Xem thống kê hệ thống (`/api/admin/stats`)| Từ chối (401) | Từ chối (403) | Cho phép |

---

## 2.5. Bảng quyết định (Decision Table) cho Thay đổi kích thước (Resize)

| Điều kiện | TH 1 | TH 2 | TH 3 | TH 4 |
| :--- | :---: | :---: | :---: | :---: |
| Kích thước width, height hợp lệ ($> 0$) | ĐÚNG | ĐÚNG | SAI | SAI |
| Tùy chọn "Giữ nguyên tỉ lệ" (keepAspectRatio) | BẬT | TẮT | BẬT | TẮT |
| **Kết quả mong đợi** | **Co giãn vừa khung (fit inside)** | **Kéo dãn đúng WxH (fill)** | **Lỗi 400 Bad Request** | **Lỗi 400 Bad Request** |

---

## 2.6. Sơ đồ chuyển trạng thái của Hình ảnh (State Diagram)

```
[Chưa upload]
      │
      │ (POST /api/images/upload)
      ▼
[Ảnh gốc lưu trữ] ─────────(DELETE /api/images/:id)─────────► [Đã xóa]
      │
      │ (POST /api/transform/...)
      ▼
[Ảnh đã biến đổi (Processed)]
      │
      │ (POST /api/transform/export)
      ▼
[Ảnh xuất thành phẩm (Download)]
```

---

## 2.7. Bảng truy vết yêu cầu (Traceability Matrix: URD $\to$ SRS)

| Mã URD | User Story tóm tắt | Mã SRS Chức năng | Mã SRS Phi chức năng |
| :--- | :--- | :--- | :--- |
| **URD-01** | Đăng ký & Xác thực người dùng | FR-01, FR-02, FR-14 | NFR-07 |
| **URD-02** | Tải lên & Quản lý thư viện ảnh | FR-03, FR-04, FR-05, FR-13 | NFR-03, NFR-08 |
| **URD-03** | Biến đổi hình ảnh (Resize, Crop, Rotate, Flip)| FR-06, FR-07, FR-08, FR-09 | NFR-01, NFR-02 |
| **URD-04** | Bộ lọc màu, Watermark & Xuất file | FR-10, FR-11, FR-12 | NFR-01, NFR-04, NFR-05 |
| **URD-05** | Quản trị hệ thống & Báo cáo | FR-15 | NFR-07 |

---

# PHẦN 3: TÀI LIỆU API (Theo mẫu Mẫu 01)

## 3.1. Thông tin chung
* **Base URL:** `http://localhost:3000` (hoặc `https://pic-transform-studio.onrender.com`)
* **Định dạng dữ liệu:** JSON, mã hóa UTF-8. Header: `Content-Type: application/json`
* **Cơ chế xác thực:** Bearer Token (JWT) trong header `Authorization: Bearer <token>`
* **Cách lấy token:** Gọi API `POST /api/auth/login`, trích xuất trường `data.token`

## 3.2. Danh sách Endpoint chi tiết

### 1. Xác thực (Authentication)
* `POST /api/auth/register` — Đăng ký tài khoản
  * Request Body: `{ "email": "user@test.com", "password": "password123" }`
  * Response 201: `{ "success": true, "data": { "token": "...", "user": { "id": 1, "email": "...", "role": "member" } } }`
  * Response 400: `{ "success": false, "message": "Mật khẩu quá ngắn" }`
* `POST /api/auth/login` — Đăng nhập
  * Request Body: `{ "email": "user@test.com", "password": "password123" }`
  * Response 200: `{ "success": true, "data": { "token": "...", "user": { "id": 1, "email": "...", "role": "member" } } }`
  * Response 401: `{ "success": false, "message": "Email hoặc mật khẩu không đúng" }`
* `POST /api/auth/change-password` — Đổi mật khẩu
  * Headers: `Authorization: Bearer <token>`
  * Request Body: `{ "currentPassword": "...", "newPassword": "..." }`
  * Response 200: `{ "success": true, "message": "Đổi mật khẩu thành công" }`

### 2. Quản lý hình ảnh (Images)
* `POST /api/images/upload` — Tải ảnh lên
  * Headers: `Authorization: Bearer <token>`, `Content-Type: multipart/form-data`
  * Form Field: `image` (binary file $\le 10$MB)
  * Response 201: `{ "success": true, "data": { "id": 1, "originalName": "photo.jpg", "width": 800, "height": 600, "size": 154200, "mimetype": "image/jpeg" } }`
* `GET /api/images/gallery?page=1&limit=12` — Danh sách thư viện ảnh cá nhân
  * Headers: `Authorization: Bearer <token>`
  * Response 200: `{ "success": true, "data": { "images": [...], "total": 8, "page": 1, "totalPages": 1 } }`
* `GET /api/images/:id` — Xem chi tiết metadata ảnh
  * Response 200: `{ "success": true, "data": { "id": 1, "originalName": "photo.jpg", "width": 800, "height": 600, "size": 154200, "fileUrl": "/api/images/1/file", "thumbnailUrl": "/api/images/1/thumbnail" } }`
* `GET /api/images/:id/thumbnail` — Trả về ảnh thumbnail
* `GET /api/images/:id/file` — Trả về file ảnh gốc (binary stream)
* `DELETE /api/images/:id` — Xóa ảnh
  * Response 200: `{ "success": true, "message": "Xóa ảnh thành công" }`

### 3. Biến đổi hình ảnh (Transformations)
* `POST /api/transform/resize` — Đổi kích thước
  * Request Body: `{ "imageId": 1, "processedId": "uuid-optional", "width": 800, "height": 600, "keepAspectRatio": true }`
  * Response 200: `{ "success": true, "data": { "processedId": "...", "width": 800, "height": 600, "size": 120500, "format": "jpeg", "previewUrl": "/api/transform/processed/..." } }`
* `POST /api/transform/crop` — Cắt ảnh
  * Request Body: `{ "imageId": 1, "x": 50, "y": 50, "width": 400, "height": 400 }`
* `POST /api/transform/rotate` — Xoay ảnh
  * Request Body: `{ "imageId": 1, "angle": 90 }` (90, 180, 270)
* `POST /api/transform/flip` — Lật ảnh
  * Request Body: `{ "imageId": 1, "direction": "horizontal" }` (horizontal / vertical)
* `POST /api/transform/filter` — Bộ lọc màu
  * Request Body: `{ "imageId": 1, "filter": "grayscale" }` (grayscale / sepia / blur)
* `POST /api/transform/watermark` — Đóng dấu chữ bản quyền
  * Request Body: `{ "imageId": 1, "text": "© PicTransform", "color": "#ffffff", "position": "bottom-right" }`
* `POST /api/transform/export` — Xuất ảnh thành phẩm
  * Request Body: `{ "imageId": 1, "processedId": "...", "format": "png", "quality": 90 }`
  * Response 200: Binary file download kèm header `Content-Disposition: attachment; filename="export.png"`

### 4. Quản trị hệ thống (Admin)
* `GET /api/admin/stats` — Thống kê tài nguyên
  * Response 200: `{ "success": true, "data": { "totalUsers": 3, "totalImages": 12, "totalStorageSize": 2540000 } }`
* `GET /api/admin/users` — Danh sách người dùng
  * Response 200: `{ "success": true, "data": { "users": [ { "id": 1, "email": "...", "role": "admin", "imageCount": 0 }, ... ] } }`
* `DELETE /api/admin/images/:id` — Quyền Admin xóa ảnh bất kỳ
