1. Bối cảnh thực tế \
Ứng dụng BrewLite yêu cầu lưu trữ dữ liệu có cấu trúc ràng buộc cao: quan hệ giữa người dùng, đơn hàng, chi tiết đơn, sản phẩm và giao dịch thanh toán. Đồng thời, hệ thống cần đảm bảo tính nhất quán, khả năng tái tạo cơ sở dữ liệu trên CI/CD và môi trường Production mà không làm mất dữ liệu. Chính vì thế nhóm quyết định chọn:
* Hệ quản trị CSDL: Chọn **PostgreSQL** để đảm bảo tính toàn vẹn dữ liệu quan hệ và hỗ trợ Transaction khóa lạc quan.
* Công cụ ORM: Chọn **Prisma** (hoặc TypeORM).
* Cơ chế Migration: Mọi thay đổi về cấu trúc bảng bắt buộc phải được sinh thành các file migration có version (`prisma migrate dev` / `typeorm migration:generate`) và đưa vào kiểm soát phiên bản Git.
* Trong pipeline CI/CD, cơ sở dữ liệu production sẽ chạy lệnh migration tự động trước khi triển khai bản mới (`prisma migrate deploy`).

2. Đánh đổi
* Ưu điểm: 
  - Hỗ trợ Type Safety tự động cho backend NestJS.
  - Toàn bộ nhóm phát triển và hệ thống CI đồng bộ cấu trúc cơ sở dữ liệu thông qua các tệp migration và seed dữ liệu mẫu.
  - Dễ dàng rollback khi có lỗi phát sinh trong quá trình triển khai.
* Nhược điểm: Phải quản lý chặt chẽ các file migration; việc xung đột nhánh (merge conflict) trên schema database cần sự phối hợp kỹ giữa các thành viên.
