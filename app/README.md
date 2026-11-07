# SỜ MỜ LỜ

Game văn phòng 3D nhiều người chơi chạy trên trình duyệt bằng Three.js, Express và Socket.IO.

## Chạy cục bộ

```sh
npm install
npm start
```

Mở `http://localhost:3000`, nhập tên và chọn nhân vật. Để trống mã phòng để tạo phòng mới; nút Mời bạn sao chép link phòng.

## Nhân vật

XÀ, CÁ 2 MANG, LƯỜI, BẦN ĐÒ và BÁO THỦ. Bò sữa và báo được nhân hoá đứng hai chân.

## Điều khiển

- WASD hoặc phím mũi tên: di chuyển.
- Click hoặc chạm sàn: đi đến vị trí.
- Click hoặc chạm người chơi khác: chọn để tương tác.
- Khung chat: nhắn tự do, hiển thị bong bóng thoại.
- Các nút hành động hoặc phím Z, X, C, B, V, M, N.

## Render

Dùng root directory `app`, build command `npm install`, start command `npm start`. Máy chủ hỗ trợ Socket.IO/WebSocket và lưu phòng trong RAM. Giới hạn phòng là 50 người; smoke test kiểm tra hai kết nối, chưa có load test 20–50 người.

## Kiểm tra

```sh
npm run test:smoke
```
