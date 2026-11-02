1. Bối cảnh \
Theo yêu cầu đặc tả của assignment 2, hệ thống cần giải quyết nguy cơ thanh toán lặp khi mạng chập chờn, hoặc khách hàng bấm nút xác nhận thanh toán nhiều lần dẫn đến việc trừ tiền hoặc tạo đơn 2 lần. Bên cạnh đó, trạng thái đơn hàng không được phép nhảy cóc hoặc chuyển đổi sai quy tắc. Nhóm đưa ra quyết định:
* Xử lý Idempotency:
   - Yêu cầu Client gửi kèm header `Idempotency-Key` (chuỗi UUID duy nhất được tạo khi nhấn thanh toán) trong request `POST /payments`.
   - Backend lưu trữ khóa này vào bảng `payments` cùng trạng thái xử lý. Nếu gặp lại khóa đã thành công, hệ thống lập tức trả về kết quả đã lưu mà không trừ tiền hay cập nhật trạng thái đơn lại.
* Order State Machine:
    - Triển khai máy trạng thái đơn hàng với hàm kiểm tra chuyển tiếp hợp lệ (`assertTransition`).
    - Chỉ cho phép các chuyển tiếp: `PENDING` -> `PAID` / `PAYMENT_FAILED` / `CANCELLED`; `PAID` -> `PREPARING` -> `READY` -> `COMPLETED`. Mọi chuyển tiếp ngoài quy tắc sẽ bị chặn và ném ra `BadRequestException`.

2. Đánh đổi 
* Ưu điểm
  - Đảm bảo tính toàn vẹn tài chính và nhất quán dữ liệu đơn hàng.
  - Dễ dàng viết Integration Test để chứng minh khả năng chặn trùng lặp và chặn chuyển sai trạng thái.
* Nhược điểm
  - Tăng độ phức tạp khi lập trình bảng dữ liệu và cần thêm chỉ mục (unique index) cho `idempotencyKey` trong database.