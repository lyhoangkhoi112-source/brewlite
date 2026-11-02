1.2 Task 1.2 - Yêu cầu chức năng và phi chức năng

1.2.1 Yêu cầu chức năng (Functional Requirements - FR) \
Mô tả các chức năng mà hệ thống BrewLite phải cung cấp nhằm đáp ứng nhu cầu của khách hàng, nhân viên quầy và quản lý cửa hàng. Mỗi yêu cầu được gán một mã định danh duy nhất, mức độ ưu tiên theo phương pháp MoSCoW và tiêu chí chấp nhận có thể kiểm chứng thông qua kiểm thử.

Việc phân loại mức độ ưu tiên của các yêu cầu được thực hiện theo phương pháp MOSCOW, dựa trên giá trị nghiệp vụ, mức độ cần thiết đối với luồng đặt món và thanh toán, cũng như phạm vi MVP của BrewLite.

• Must: Yêu cầu bắt buộc để hệ thống hoàn thành luồng nghiệp vụ cốt lõi và đáp ứng các tiêu chí nghiệm thu. \
• Should: Yêu cầu quan trọng nhưng có thể được triển khai sau các chức năng Must nếu nguồn lực bị giới hạn. \
• Could: Yêu cầu bổ sung có giá trị, được thực hiện khi còn thời gian và nguồn lực. \
• Won't: Yêu cầu được xác định chưa triển khai trong phiên bản hiện tại và được xem xét ở các phiên bản sau. 

Các yêu cầu chức năng được trình bày theo trình tự nghiệp vụ từ xem thực đơn, lựa chọn sản phẩm, quản lý giỏ hàng, xác thực, đặt hàng, thanh toán đến xác nhận và theo dõi đơn hàng. Các chức năng quản trị và mở rộng được trình bày sau luồng nghiệp vụ chính.

| Mã | Chức năng | Mô tả yêu cầu | Ưu tiên | Tiêu chí chấp nhận |
| :--- | :--- | :--- | :--- | :--- |
| FR-01 | Đăng ký tài khoản | Hệ thống cho phép người dùng tạo tài khoản để sử dụng các chức năng cần xác thực. | Must | Khi thông tin đăng ký hợp lệ và chưa trùng tài khoản, hệ thống tạo tài khoản thành công; dữ liệu không hợp lệ hoặc tài khoản trùng phải được thông báo. |
| FR-02 | Đăng nhập và xác thực | Hệ thống cho phép người dùng đăng nhập và sử dụng JWT để xác thực các yêu cầu cần quyền truy cập. | Must | Thông tin đăng nhập đúng cho phép người dùng xác thực; thông tin sai bị từ chối. API được bảo vệ phải từ chối yêu cầu thiếu hoặc có JWT không hợp lệ. |
| FR-03 | Xem thực đơn | Hệ thống cho phép khách hàng xem danh sách đồ uống, bao gồm tên sản phẩm, giá bán, hình ảnh (nếu có) và danh mục. | Must | Khi truy cập trang thực đơn, hệ thống hiển thị danh sách sản phẩm hợp lệ cùng thông tin tương ứng từ dữ liệu hệ thống. |
| FR-04 | Xem chi tiết sản phẩm | Hệ thống cho phép khách hàng xem thông tin chi tiết của một sản phẩm được chọn. | Must | Khi chọn một sản phẩm tồn tại, hệ thống hiển thị đúng tên, giá và các thông tin tùy chọn của sản phẩm. Nếu sản phẩm không tồn tại, hệ thống thông báo phù hợp. |
| FR-05 | Tùy chọn sản phẩm | Hệ thống cho phép khách hàng lựa chọn kích cỡ, mức đường, mức đá và topping theo các tùy chọn được cửa hàng hỗ trợ. | Must | Các tùy chọn hợp lệ được lưu cùng sản phẩm trong giỏ hàng; hệ thống không chấp nhận lựa chọn không hợp lệ. |
| FR-06 | Quản lý giỏ hàng | Hệ thống cho phép khách hàng thêm sản phẩm, thay đổi số lượng, cập nhật tùy chọn và xóa sản phẩm khỏi giỏ hàng. | Must | Sau mỗi thao tác, danh sách sản phẩm, số lượng và tổng tiền được cập nhật chính xác; không cho phép số lượng nhỏ hơn 1 đối với sản phẩm còn trong giỏ. |
| FR-07 | Tính tổng tiền | Hệ thống tự động tính thành tiền của từng sản phẩm và tổng giá trị giỏ hàng dựa trên giá bán, số lượng và các tùy chọn có tính phí. | Must | Với dữ liệu đầu vào xác định trước, tổng tiền hiển thị bằng tổng thành tiền của các mặt hàng và được tính lại khi giỏ hàng thay đổi. |
| FR-08 | Đặt đơn hàng | Hệ thống cho phép khách hàng gửi yêu cầu đặt hàng từ giỏ hàng sau khi xác nhận thông tin đơn. | Must | Với giỏ hàng hợp lệ và thông tin cần thiết đầy đủ, hệ thống tạo đơn hàng có mã định danh duy nhất; giỏ hàng rỗng hoặc dữ liệu không hợp lệ không được tạo thành đơn thành công. |
| FR-09 | Thanh toán điện tử | Hệ thống cho phép khách hàng thực hiện thanh toán bằng ví điện tử hoặc thẻ thông qua dịch vụ thanh toán mô phỏng. | Must | Khi giao dịch thành công, hệ thống ghi nhận kết quả thanh toán và cập nhật trạng thái tương ứng. Khi giao dịch thất bại, hệ thống thông báo lỗi và không ghi nhận đơn là đã thanh toán thành công. |
| FR-10 | Xác nhận đơn hàng | Hệ thống hiển thị thông tin xác nhận sau khi đơn hàng được tạo và cung cấp mã đơn hàng để khách hàng đối chiếu tại quầy. | Must | Sau khi tạo đơn thành công, khách hàng nhận được mã đơn duy nhất cùng thông tin đơn hàng; mã đơn có thể được sử dụng để tra cứu đơn. |
| FR-11 | Xem lịch sử đơn hàng | Hệ thống cho phép khách hàng đã đăng nhập xem danh sách các đơn hàng thuộc tài khoản của mình. | Should | Danh sách chỉ chứa đơn hàng của người dùng hiện tại; thông tin mã đơn, thời gian, tổng tiền và trạng thái được hiển thị chính xác. |
| FR-12 | Theo dõi trạng thái đơn | Hệ thống cho phép khách hàng xem trạng thái hiện tại của đơn hàng đã đặt. | Must | Khi trạng thái đơn được cập nhật, lần truy vấn tiếp theo trả về trạng thái mới nhất đã được lưu trong hệ thống. |
| FR-13 | Quản lý đơn hàng tại quầy | Hệ thống cho phép nhân viên có quyền xem danh sách đơn hàng và cập nhật trạng thái xử lý đơn. | Must | Người dùng có quyền được phép xem và cập nhật trạng thái hợp lệ; người dùng không có quyền không thể thực hiện thao tác quản lý đơn. |
| FR-14 | Quản lý thông tin sản phẩm | Hệ thống cho phép người dùng có quyền quản lý thêm, sửa hoặc cập nhật thông tin sản phẩm trên thực đơn. | Should | Thông tin hợp lệ sau khi lưu được phản ánh trên thực đơn; dữ liệu không hợp lệ bị từ chối và có thông báo phù hợp. |
| FR-15 | Kiểm tra dữ liệu đặt hàng | Hệ thống kiểm tra thông tin sản phẩm, số lượng, giá và các tùy chọn trước khi tạo đơn hàng. | Must | Nếu sản phẩm không tồn tại, số lượng không hợp lệ hoặc dữ liệu không đáp ứng quy tắc nghiệp vụ, hệ thống từ chối tạo đơn và trả về thông báo phù hợp. |
| FR-16 | Xử lý yêu cầu thanh toán lặp | Hệ thống hạn chế việc một yêu cầu thanh toán được xử lý nhiều lần do người dùng gửi lại yêu cầu hoặc kết nối bị gián đoạn. | Must | Khi gửi lại cùng một yêu cầu thanh toán có cùng khóa định danh chống lặp, hệ thống không tạo thêm giao dịch thành công ngoài ý muốn cho cùng một yêu cầu. |
| FR-17 | Tích điểm thành viên | Hệ thống tích điểm theo giá trị giao dịch và hỗ trợ đổi điểm hoặc mã giảm giá. | Won't | Chức năng chưa được triển khai trong MVP; không yêu cầu nghiệm thu trong phiên bản hiện tại. |
| FR-18 | Quản lý tồn kho nguyên liệu | Hệ thống tự động cập nhật lượng nguyên liệu sử dụng sau các giao dịch đặt hàng thành công. | Won't | Chức năng chưa được triển khai trong MVP; không yêu cầu nghiệm thu trong phiên bản hiện tại. |
| FR-19 | Gợi ý đồ uống | Hệ thống đề xuất đồ uống dựa trên lịch sử mua hàng và sở thích của khách hàng. | Won't | Chức năng chưa được triển khai trong MVP; không yêu cầu nghiệm thu trong phiên bản hiện tại. |

1.2.2 Yêu cầu phi chức năng
Yêu cầu phi chức năng (Non-functional Requirements - NFR) \
 Xác định các tiêu chí về chất lượng, hiệu năng, bảo mật, khả năng sử dụng và triển khai của hệ thống BrewLite. Các yêu cầu này được gán mã định danh riêng và có tiêu chí chấp nhận cụ thể để phục vụ quá trình kiểm thử và nghiệm thu.

| Mã | Thuộc tính | Mô tả yêu cầu | Ưu tiên | Tiêu chí chấp nhận |
| :--- | :--- | :--- | :--- | :--- |
| NFR-01 | Hiệu năng | Hệ thống cần phản hồi nhanh đối với các thao tác phổ biến như xem thực đơn, xem chi tiết sản phẩm và truy vấn trạng thái đơn hàng. | Must | Trong môi trường kiểm thử được xác định trước, ít nhất 95% yêu cầu đọc dữ liệu thành công có thời gian phản hồi không vượt quá 2 giây khi có tối đa 50 người dùng đồng thời. |
| NFR-02 | Bảo mật | Hệ thống phải bảo vệ thông tin tài khoản, kiểm soát quyền truy cập và xác thực các API cần đăng nhập. | Must | API được bảo vệ từ chối yêu cầu không có JWT hoặc có JWT không hợp lệ. Mật khẩu không được lưu dưới dạng văn bản thuần và thông tin bí mật không xuất hiện trong mã nguồn công khai hoặc log. |
| NFR-03 | Tính toàn vẹn dữ liệu | Hệ thống phải đảm bảo dữ liệu đơn hàng và thanh toán được lưu nhất quán, hạn chế tạo đơn hoặc ghi nhận thanh toán trùng lặp. | Must | Các kiểm thử giao dịch xác nhận dữ liệu không bị ghi nhận thành công sai khi thao tác thất bại; việc gửi lại cùng yêu cầu thanh toán không tạo giao dịch thành công trùng lặp. |
| NFR-04 | Khả năng sử dụng | Giao diện phải trực quan, dễ thao tác và phù hợp với màn hình điện thoại, máy tính bảng và máy tính. | Must | Các màn hình chính sử dụng được ở độ rộng 360 px trở lên mà không xuất hiện thanh cuộn ngang ngoài chủ đích; các nút thao tác chính và thông báo lỗi hiển thị rõ ràng. |
| NFR-05 | Tính khả dụng | Hệ thống cần thông báo rõ trạng thái tải dữ liệu, dữ liệu rỗng và lỗi khi thực hiện thao tác. | Must | Khi API đang xử lý, không có dữ liệu hoặc trả về lỗi, giao diện lần lượt hiển thị trạng thái loading, empty hoặc error phù hợp và cho phép người dùng thử lại khi có thể. |
| NFR-06 | Khả năng triển khai | Hệ thống phải có khả năng khởi chạy trong môi trường phát triển bằng cấu hình và hướng dẫn được cung cấp. | Must | Sau khi cấu hình biến môi trường theo tài liệu, các thành phần web, API và PostgreSQL có thể khởi chạy bằng Docker Compose theo hướng dẫn trong README. |
| NFR-07 | Khả năng bảo trì | Mã nguồn cần được tổ chức rõ ràng, có quy ước lập trình và hỗ trợ kiểm tra chất lượng tự động. | Should | Pipeline CI thực hiện thành công các bước cài đặt phụ thuộc, lint, unit test và build khi mã nguồn đáp ứng yêu cầu chất lượng. |
| NFR-08 | Khả năng phục hồi | Hệ thống cần xử lý được lỗi kết nối hoặc lỗi dịch vụ bên ngoài mà không hiển thị thông tin kỹ thuật nhạy cảm cho người dùng. | Should | Khi dịch vụ thanh toán mô phỏng hoặc API gặp lỗi, hệ thống trả về phản hồi lỗi phù hợp, không tự động đánh dấu giao dịch thất bại thành công và không làm lộ thông tin bí mật. |
| NFR-09 | Khả năng giám sát | Hệ thống cần cung cấp thông tin trạng thái hoạt động để hỗ trợ kiểm tra và triển khai. | Must | API cung cấp endpoint GET /health để kiểm tra trạng thái hoạt động; endpoint trả về phản hồi thành công khi dịch vụ đáp ứng điều kiện sức khỏe đã quy định. |