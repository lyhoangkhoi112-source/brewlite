1. Bối cảnh thực tế \
BrewLite là hệ thống bán đồ uống trực tuyến, bao gồm các chức năng quản lý sản phẩm, giỏ hàng, đơn hàng, thanh toán và tài khoản người dùng. Hệ thống cần dễ bảo trì, dễ mở rộng và phù hợp với quy mô dự án học tập. Nhóm quyết định áp dụng Layered Architecture (Kiến trúc phân lớp) để phân tách trách nhiệm giữa các thành phần của hệ thống.
2. Đánh đổi 
* Ưu điểm: \
-Cấu trúc rõ ràng, dễ hiểu.\
-Dễ phân chia công việc cho các thành viên. \
-Giảm sự phụ thuộc giữa giao diện và cơ sở dữ liệu.\
-Thuận tiện cho việc bảo trì và nâng cấp hệ thống.\
-Hỗ trợ tái sử dụng mã nguồn tốt hơn.
* Nhược điểm: \
-Tăng số lượng lớp và file cần quản lý.\
-Luồng xử lý phải đi qua nhiều lớp nên có thể làm tăng độ phức tạp.\
-Một thay đổi nghiệp vụ đôi khi cần cập nhật ở nhiều lớp khác nhau.