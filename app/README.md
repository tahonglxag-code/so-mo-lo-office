# SỜ MỜ LỜ

Game văn phòng 3D nhiều người chơi trên trình duyệt, chạy bằng Node.js, Express, Socket.IO và Three.js.

## Chạy

```sh
npm install
npm start
```

Mở `http://localhost:3000`. Nhập tên, chọn một trong bốn nhân vật, rồi để trống mã phòng để tạo phòng mới. Nút Mời bạn sao chép link có kèm mã phòng.

## Điều khiển

- WASD hoặc phím mũi tên: di chuyển
- Chạm hoặc click sàn: đi đến điểm đó
- Chạm người chơi khác: chọn để tương tác
- Chat tự do, tin nhắn hiển thị trong bong bóng
- Nút hành động phía dưới hoặc phím tắt Z, X, C, B, V, M, N

## Render Free

Đặt thư mục gốc dịch vụ là `app`, lệnh build là `npm install`, lệnh chạy là `npm start`. Dịch vụ dùng Socket.IO trên cùng cổng HTTP. Máy chủ giữ phòng trong RAM; khi Render khởi động lại hoặc tạm dừng, người chơi sẽ phải vào lại phòng.

Phòng giới hạn 50 người trong mã, nhưng mới kiểm tra đồng bộ với hai kết nối. Chưa có bài kiểm thử tải 20–50 kết nối đồng thời.
