1. Bối cảnh thực tế \
Dự án BrewLite gồm hai phần: Frontend chạy Next.js và Backend chạy NestJS. Nếu tạo 2 repository Git riêng biệt (polyrepo), mỗi khi làm một tính năng mới (ví dụ: tạo đơn hàng), một bạn sửa API ở repo backend, một bạn sửa giao diện ở repo frontend sẽ rất khó đồng bộ lịch sử commit, khó chạy CI/CD và kiểm thử toàn diện. Chính vì thế chúng ta cần gom toàn bộ mã nguồn vào chung một repository Git duy nhất (Monorepo).

2. Đánh đổi 
* Ưu điểm: \
-Quản lý tập trung: Tất cả frontend, backend, mobile và tài liệu nằm trong một repository. \
-Dễ chia sẻ code: Có thể dùng chung thư viện, model, utility giữa nhiều dự án. \
-Refactor thuận tiện: Thay đổi một chức năng có thể cập nhật đồng thời trên toàn hệ thống. \
-Đồng bộ phiên bản: Các thành phần sử dụng cùng một phiên bản code và dependency. \
-CI/CD thống nhất: Dễ xây dựng quy trình build, test và deploy tập trung.
* Nhược điểm: \
-Repository lớn dần theo thời gian: Clone, build và quản lý có thể chậm hơn. \
-Phụ thuộc lẫn nhau cao: Lỗi trong module dùng chung có thể ảnh hưởng nhiều thành phần. \
-CI/CD phức tạp khi hệ thống lớn: Cần tối ưu để tránh build lại toàn bộ dự án. \