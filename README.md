# SỜ MỜ LỜ

Một văn phòng 3D nhiều người chơi chạy trên trình duyệt. Người chơi tạo phòng bằng mã, gửi link mời, đi lại, chat và tương tác bằng hiệu ứng emoji.

## Chạy trên máy cá nhân

```sh
npm install
npm start
```

Mở `http://localhost:3000`. Phòng có giới hạn cấu hình 50 người. Dữ liệu phòng lưu trong bộ nhớ máy chủ và sẽ mất khi máy chủ khởi động lại.

## Điều khiển

- WASD hoặc phím mũi tên: di chuyển
- Chạm/click nền: đi đến vị trí
- Chạm người chơi: chọn mục tiêu
- Khung chat: gửi tin nhắn và bong bóng thoại
- Nút bên dưới hoặc phím tắt: tương tác

## Triển khai

Tệp `render.yaml` khai báo dịch vụ web Node.js trên Render Free. Khi dịch vụ Free không hoạt động, Render có thể tạm dừng máy chủ; lần truy cập tiếp theo có thể cần chờ dịch vụ thức dậy. Mã phòng và trạng thái người chơi không được lưu bền vững.

## Nguồn

Giao diện 3D được dựng bằng Three.js; máy chủ nhiều người chơi dùng Express và Socket.IO. Mô hình nhân vật được tạo từ hình khối Three.js, không tải mô hình bên ngoài.

## Kiểm tra kết nối

```sh
npm run test:smoke
```

Kiểm tra trang, tài nguyên, hai người trong cùng phòng, đồng bộ di chuyển, chat và tương tác ném.
