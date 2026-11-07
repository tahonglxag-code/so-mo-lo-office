# VP SỜ MỜ LỜ

Game văn phòng 3D nhiều người chơi trên trình duyệt, chạy bằng Node.js, Express, Socket.IO và Three.js.

## Chạy

```sh
npm install
npm start
```

Mở `http://localhost:3000`. Nhập tên, chọn XÀ, CÁ 2 MANG, LƯỜI, BẦN ĐÒ hoặc BÁO THỦ. Để trống mã phòng để tạo mã tự động hoặc nhập mã riêng để tạo hay tham gia phòng đó. Nút Mời bạn sao chép link mời.

## Điều khiển

- WASD hoặc phím mũi tên: di chuyển.
- Click hoặc chạm sàn: đi đến vị trí.
- Click hoặc chạm người chơi khác: chọn để tương tác.
- Khung chat: nhắn tự do, hiển thị bong bóng thoại.
- Nút hành động phía dưới hoặc phím Z, X, C, B, V, M, N.
- LÀM VIỆC: tối đa 6 người cùng lúc, mỗi chỗ có một bàn, laptop và ghế; đồng hồ bắt đầu khi nhân vật tới bàn, gửi các mốc thời gian lên cổng chung và tự kết thúc ở 999 giây.
- HỌP GẤP gọi người chơi trong phòng vào phòng họp B; LÚA VỀ rải tiền giấy trong 5 giây.

## Render Free

Đặt thư mục gốc dịch vụ là `app`, lệnh build là `npm install`, lệnh chạy là `npm start`. Dịch vụ dùng Socket.IO trên cùng cổng HTTP. Phòng được lưu trong RAM; khi Render khởi động lại hoặc tạm dừng, người chơi phải vào lại phòng.

Phòng giới hạn 50 người trong mã. Smoke test kiểm tra đồng bộ hai người chơi và mốc làm việc 9 giây; chưa có kiểm thử tải 20–50 kết nối hoặc chờ đủ 999 giây.

## Kiểm tra

```sh
npm run test:smoke
```
