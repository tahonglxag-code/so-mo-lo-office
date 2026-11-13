const tenVai = {"cupid":"Cupid","guard":"Bảo vệ","wolf":"Ma Sói","hunter":"Thợ săn","seer":"Tiên tri","witch":"Phù thủy","villager":"Dân làng"};
const tenLyDo = {"wolf":"bị Sói cắn","poison":"trúng thuốc độc","hunter":"bị Thợ săn bắn","cupid":"chết theo người được Cupid ghép cặp","vote":"bị loại do bỏ phiếu","disconnect":"bị loại do mất kết nối"};
const tenLyDoBoQua = {"khong-co-nguoi-con-song":"không còn người giữ vai đủ điều kiện thực hiện","khong-bi-soi-can":"không có lượt bắn vì Thợ săn không bị Sói cắn","soi-khong-thong-nhat":"Sói không thống nhất hoặc không hoàn tất chọn mục tiêu","het-thoi-gian":"hết thời gian lựa chọn"};
const tenPheThang = {"wolves":"Phe Ma Sói chiến thắng","villagers":"Phe Dân làng chiến thắng","draw":"Ván đấu kết thúc hòa"};

export function dinhDangLichSuMaSoi(lichSu) {
  const suKien=Array.isArray(lichSu)?lichSu:[];
  const dong=[];
  const them=giaTri=>dong.push(giaTri);
  const phanVai=suKien.find(item=>item.loai==="phan-vai");
  const ketQua=suKien.find(item=>item.loai==="ket-qua");
  const daDungChet=new Set();
  const layTen=giaTri=>giaTri||"Không rõ";
  const boQuaVai=event=>Array.isArray(event.boQuaChiTiet)&&event.boQuaChiTiet.length?event.boQuaChiTiet:(event.boQua||[]).map(vai=>({vai,lyDo:"bo-qua-hoac-het-gio"}));
  const dongChet=nguoi=>`${layTen(nguoi.ten)} (${tenLyDo[nguoi.nguyenNhan]||"nguyên nhân chưa được ghi nhận"})`;
  them("I. PHÂN VAI");
  if(phanVai?.nguoi?.length){
    for(const nguoi of phanVai.nguoi)them(`• ${layTen(nguoi.ten)} — ${layTen(nguoi.vai)} · Phe ${layTen(nguoi.phe)}`);
  }else them("Chưa có dữ liệu phân vai.");
  if(phanVai?.capDoi?.length){
    them("Các cặp Cupid:");
    for(const cap of phanVai.capDoi)them(`• ${cap[0]} ↔ ${cap[1]}`);
  }else them("Không có cặp Cupid.");
  let demDaGhi=0;
  let ngayDaGhi=0;
  for(let i=0;i<suKien.length;i++){
    const event=suKien[i];
    if(event.loai==="dem"){
      demDaGhi=event.ngay||demDaGhi+1;
      them("");
      them(`II. ĐÊM ${demDaGhi}`);
      const boQua=boQuaVai(event);
      const vaiBoQua=new Set(boQua.map(item=>item.vai));
      if(event.cupid?.length)them(`• Cupid ghép: ${event.cupid.join(" ↔ ")}`);
      else if(vaiBoQua.has("cupid"))them("• Cupid: không có người đủ điều kiện hoặc lượt không được thực hiện.");
      if(event.baoVe)them(`• Bảo vệ chọn: ${event.baoVe}`);
      else them("• Bảo vệ: không có mục tiêu được ghi nhận.");
      const luaChonSoi=event.luaChonSoi||[];
      if(luaChonSoi.length){
        them(`• Sói chọn: ${luaChonSoi.map(item=>`${layTen(item.soi)} → ${layTen(item.mucTieu)}`).join("; ")}`);
        them(event.soiDongThuan?`• Kết luận của Sói: thống nhất cắn ${layTen(event.soi)}.`:"• Kết luận của Sói: không thống nhất mục tiêu, không cắn.");
      }else if(event.soi)them(`• Sói chọn: ${event.soi}.`);
      else if(vaiBoQua.has("wolf"))them("• Sói: lượt chọn bị bỏ qua, hết giờ hoặc không thống nhất mục tiêu.");
      else them("• Sói: không ghi nhận mục tiêu.");
      if(event.tienTri)them(`• Tiên tri soi ${event.tienTri}: ${event.ketQuaSoi||"không có kết quả"}.`);
      else if(vaiBoQua.has("seer"))them("• Tiên tri: lượt bị bỏ qua hoặc hết thời gian.");
      if(event.phuThuy?.loai==="save")them(`• Phù thủy dùng thuốc cứu lên ${layTen(event.phuThuy.nguoi)}: ${event.phuThuy.hieuQua?"cứu thành công":"không cứu được mục tiêu"}.`);
      else if(event.phuThuy?.loai==="poison")them(`• Phù thủy dùng thuốc độc lên ${layTen(event.phuThuy.nguoi)}: ${event.phuThuy.hieuQua?"thuốc có hiệu lực":"thuốc không có hiệu lực"}.`);
      else if(event.phuThuy?.loai==="skip")them("• Phù thủy chủ động bỏ qua lượt.");
      else if(vaiBoQua.has("witch"))them("• Phù thủy: lượt bị bỏ qua hoặc hết thời gian.");
      else them("• Phù thủy: không sử dụng thuốc.");
      if(event.thoSanBan)them(`• Thợ săn ${layTen(event.thoSan)} bắn ${event.thoSanBan}.`);
      else if(event.thoSan)them(`• Thợ săn ${event.thoSan} không có mục tiêu bắn.`);
      const boQuaHienThi=boQua.filter(item=>!(item.vai==="witch"&&event.phuThuy?.loai==="skip")).map(item=>`${tenVai[item.vai]||item.vai}: ${tenLyDoBoQua[item.lyDo]||"bỏ qua hoặc hết thời gian"}`);
      if(boQuaHienThi.length)them(`• Lượt bỏ qua / hết giờ: ${boQuaHienThi.join("; ")}.`);
      let mocKetQua=i+1;
      while(mocKetQua<suKien.length&&!["ket-qua-dem","dem","vote","phan-vai","ket-qua"].includes(suKien[mocKetQua].loai))mocKetQua++;
      const chetDem=[];
      for(let j=i+1;j<mocKetQua;j++){
        if(suKien[j].loai==="chet"){
          daDungChet.add(j);
          chetDem.push(...(suKien[j].nguoi||[]));
        }
      }
      const ketQuaDem=suKien[mocKetQua]?.loai==="ket-qua-dem"?suKien[mocKetQua]:null;
      if(chetDem.length)them(`• Người chết: ${chetDem.map(dongChet).join("; ")}.`);
      else if(ketQuaDem?.chet?.length)them(`• Người chết: ${ketQuaDem.chet.join(", ")}.`);
      else them("• Không có ai chết trong đêm.");
      if(ketQuaDem)mocKetQua++;
      i=mocKetQua-1;
    }else if(event.loai==="vote"){
      ngayDaGhi=event.ngay||ngayDaGhi+1;
      them("");
      them(`III. NGÀY ${ngayDaGhi} — KẾT QUẢ BỎ PHIẾU`);
      const phieu=Array.isArray(event.phieu)?event.phieu:[];
      const demPhieu=new Map();
      if(phieu.length){
        them("Các lượt bỏ phiếu:");
        for(const phieuCuaNguoi of phieu){
          const mucTieu=phieuCuaNguoi.to||"Trắng";
          them(`• ${layTen(phieuCuaNguoi.from)} → ${mucTieu}`);
          demPhieu.set(mucTieu,(demPhieu.get(mucTieu)||0)+1);
        }
        them("Tổng số phiếu:");
        for(const [mucTieu,soPhieu] of demPhieu)them(`• ${mucTieu}: ${soPhieu} phiếu`);
      }else them("Không có phiếu được ghi nhận.");
      const tenNguoiBiLoai=event.chet||[];
      const chetVote=[];
      for(let j=0;j<suKien.length;j++){
        if(daDungChet.has(j)||suKien[j].loai!=="chet")continue;
        const nguoi=suKien[j].nguoi||[];
        if(nguoi.some(item=>tenNguoiBiLoai.includes(item.ten))){
          daDungChet.add(j);
          chetVote.push(...nguoi);
        }
      }
      if(event.hoa)them("Kết quả: hòa phiếu, không ai bị loại.");
      else if(tenNguoiBiLoai.length){
        if(chetVote.length)them(`Người bị loại: ${chetVote.map(dongChet).join("; ")}.`);
        else them(`Người bị loại: ${tenNguoiBiLoai.join(", ")}.`);
      }else them("Kết quả: không ai bị loại.");
    }
  }
  const chetNgoaiLuot=[];
  for(let i=0;i<suKien.length;i++){
    if(daDungChet.has(i)||suKien[i].loai!=="chet")continue;
    for(const nguoi of suKien[i].nguoi||[])chetNgoaiLuot.push(nguoi);
  }
  if(chetNgoaiLuot.length){
    them("");
    them("IV. SỰ KIỆN KHÁC");
    for(const nguoi of chetNgoaiLuot)them(`• ${dongChet(nguoi)}`);
  }
  if(ketQua){
    them("");
    them("V. KẾT QUẢ CUỐI CÙNG");
    them(`• ${tenPheThang[ketQua.pheThang]||"Chưa xác định"}`);
    them(`• Người thắng: ${(ketQua.nguoiThang||[]).join(", ")||"Không có"}`);
    them(`• Người thua: ${(ketQua.nguoiThua||[]).join(", ")||"Không có"}`);
    them(`• Còn sống: ${(ketQua.nguoiSong||[]).join(", ")||"Không có"}`);
    them(`• Đã chết: ${(ketQua.nguoiChet||[]).join(", ")||"Không có"}`);
    them(`• Tổng số ngày: ${ketQua.soNgay||0} · Tổng số đêm: ${ketQua.soNgay||0}`);
    if(ketQua.pheThang==="wolves")them("• Sự kiện quyết định: số Sói còn sống bằng hoặc nhiều hơn số người phe Dân còn sống.");
    else if(ketQua.pheThang==="villagers")them("• Sự kiện quyết định: không còn Sói sống.");
    else them("• Sự kiện quyết định: không còn người chơi sống.");
  }
  return dong.join("\n");
}

