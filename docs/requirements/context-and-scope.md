1.1 Task 1.1 - Bối cảnh, stakeholder và phạm vi

1.1.1 Bối cảnh \
Trong thời đại chuyển đổi số trong ngành F&B (Food and Beverage) và sự bùng nổ của thành toán không dùng tiền mặt (ví điện tử, thẻ ngân hàng, cổng thanh toán trực tiếp) đang dần thay đổi thói quen tiêu dùng của khách hàng.

Tại các quán cà phê hiện nay, việc khách hàng phải xếp hàng và chờ gọi món và thanh toán bằng tiền mặt đã quá tải cho quầy thu ngân đặc biệt là các giờ cao điểm, gây nên sự chậm trễ trong khâu phục vụ và dễ xảy ra sai sót trong quá trình tính toán trong khâu đối soát tiền mặt.

Dự án BrewLite được khởi xướng như một giải pháp nhằm cho phép khách hàng tự chủ động duyệt thực đơn, tùy chọn sản phẩm và thanh toán trực tiếp nhanh chóng, mang lại trải nghiệm tiện lợi và tối ưu hóa vận hành cho cửa hàng.

1.1.2 Stakeholder
| Stakeholder | Mục tiêu | Kỳ vọng |
| :--- | :--- | :--- |
| Khách hàng | Đặt được đồ uống mong muốn một cách nhanh chóng, chính xác và không cần dùng đến tiền mặt | Giao diện dễ sử dụng, thao tác đặt món nhanh, an toàn khi thanh toán và hiển thị đơn rõ ràng |
| Nhân viên quầy | Tiếp nhận và chuẩn bị đúng món theo yêu cầu của đơn hàng mà không bị quá tải hay nhầm lẫn ở khâu thu ngân | Trạng thái đơn cập nhật nhanh chóng, nhận thông tin đơn chính xác và giảm sai sót |
| Quản lý cửa hàng | Tối ưu hóa hiệu suất vận hành tại điểm bán, kiểm soát doanh thu minh bạch và nâng cao trải nghiệm của người tiêu dùng | Hệ thống phải hoạt động ổn định, giảm thiểu lỗi thanh toán. Dễ dàng theo dõi đơn hàng đã xử lý. Kiểm soát dòng tiền giao dịch, hạn chế thất thoát |
| Giảng viên/Khách hàng nghiệm thu | Đánh giá mức độ hoàn thiện của hệ thống, xác nhận hệ thống đáp ứng các yêu cầu đã được đặc tả và đạt được mục tiêu của dự án. | Hệ thống hoạt động ổn định, đáp ứng đầy đủ các chức năng duyệt thực đơn, lựa chọn sản phẩm và thanh toán không dùng tiền mặt. Giao diện thân thiện, dễ sử dụng; quy trình đặt món và thanh toán diễn ra nhanh chóng, chính xác, đảm bảo tính bảo mật và đáp ứng các mục tiêu đề ra của dự án. |
| Nhóm phát triển | Hoàn thành tốt bài tập lớn và vận dụng thuần thục quy trình Agile Scrum | Phân công công việc rõ ràng, theo dõi tiến độ qua từng Sprint/Task hiệu quả. Quản lý mã nguồn, kịch bản kiểm thử và bàn giao sản phẩm đúng thời hạn yêu cầu |
| Đơn vị thanh toán | Cung cấp kênh trung gian thanh toán bảo mật, xử lý giao dịch điện tử giữa khách hàng và cửa hàng | Tránh tình trạng giao dịch trùng lặp hoặc lỗi rò rỉ dữ liệu thanh toán nhạy cảm |

1.1.3 Phạm vi trong MVP, phạm vi mở rộng và các nội dung không thực hiện
1. Phạm vi trong MVP (Minimum Viable Product): MVP của BrewLite tập trung vào việc hỗ trợ khách hàng tự đặt món và thanh toán tại quán cà phê, đồng thời giúp nhân viên và quản lý theo dõi đơn hàng hiệu quả.
Luồng nghiệp vụ chính:
Xem món -> Chọn món/Tùy chọn -> Giỏ hàng -> Thanh toán -> Nhận mã đơn -> Xử lý đơn hàng.
Các chức năng thuộc phạm vi MVP bao gồm:
• Hiển thị thực đơn (menu): Danh sách món phân theo danh mục, hiển thị tên, giá tiền, ảnh mô tả (nếu có).
• Chọn món và tùy chọn sản phẩm: Khách hàng chọn món mong muốn đặt, tùy chọn kích cỡ, mức đường, mức đá, hoặc các món đi kèm (topping).
• Giỏ hàng và đơn hàng: Thêm/sửa/xóa món trong giỏ hàng, tính tổng tiền tự động.
• Thanh toán không dùng tiền mặt: Tích hợp cổng thanh toán, cập nhật trạng thái đơn hàng sang "đã thanh toán".
• Hiển thị biên nhận/Mã đơn: Trả về mã đơn hàng để khách hàng đối soát tại quầy.

2. Phạm vi mở rộng: Các chức năng sau không thuộc phiên bản MVP nhưng có thể được phát triển trong các phiên bản tiếp theo:
• Quản lý nguyên liệu tồn kho: Tự động trừ định lượng cà phê, sữa, siro, ... khi có đơn đặt hàng thành công.
• Hệ thống thành viên và tích điểm: Tích điểm theo số tiền thanh toán, đổi mã giảm giá
• Gợi ý đồ uống dựa trên lịch sử mua hàng: Dựa vào lịch sử mua hàng của khách hàng từ đó gợi ý đồ uống.

3. Nội dung không thực hiện: Trong phạm vi dự án hiện tại, BrewLite không bao gồm:
• Thanh toán bằng tiền mặt.
• Dịch vụ giao hàng và quản lý shipper.
• Mô hình chuỗi đa cửa hàng.

1.1.4 Giả định, Ràng buộc, Rủi ro ban đầu
1. Giả định: Trong quá trình phát triển hệ thống BrewLite, nhóm đưa ra các giả định sau:
• Khách hàng sở hữu điện thoại hoặc thiết bị có kết nối Internet để truy cập hệ thống.
• Cửa hàng có kết nối mạng ổn định phục vụ cho việc đặt món và thanh toán.
• Thông tin về thực đơn, giá cả và sản phẩm được cửa hàng cung cấp chính xác.
• Cổng thanh toán trực tuyến được tích hợp hoạt động ổn định trong thời gian vận hành hệ thống.

2. Ràng buộc: Dự án BrewLite được thực hiện với các ràng buộc sau:
• Thời gian phát triển giới hạn trong phạm vi của học phần Công nghệ Phần mềm.
• Nguồn lực phát triển giới hạn trong phạm vi nhóm thực hiện dự án.
• MVP chỉ tập trung vào quy trình đặt món và thanh toán tại quầy.
• Hệ thống chưa hỗ trợ quản lý giao hàng hoặc nhiều chi nhánh trong giai đoạn đầu.
• Việc tích hợp thanh toán phụ thuộc vào API và chính sách của nhà cung cấp cổng thanh toán.
• Giao diện hệ thống cần thân thiện và dễ sử dụng đối với nhiều đối tượng khách hàng.

3. Rủi ro ban đầu: Các rủi ro được xác định trong giai đoạn đầu của dự án bao gồm:
• Yêu cầu nghiệp vụ có thể thay đổi trong quá trình phát triển.
• Khả năng tích hợp cổng thanh toán gặp lỗi hoặc thay đổi chính sách từ nhà cung cấp.
• Sự cố kết nối mạng có thể làm gián đoạn quá trình đặt món hoặc thanh toán.
• Thành viên dự án có thể gặp khó khăn trong việc phân bổ thời gian và phối hợp công việc.
• Ước lượng thời gian phát triển chưa chính xác dẫn đến chậm tiến độ.
• Hệ thống phát sinh lỗi khi số lượng người dùng đồng thời vượt quá dự kiến.
• Công nghệ bắt buộc: Nest.JS (Backend) + Next.js (Frontend)