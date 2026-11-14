const cacGiaiDoanBanDem=new Set(['night','night-role','wolf-chat','wolf-choice']);

export function laDemMaSoi(thamGia,giaiDoan){
  return Boolean(thamGia&&cacGiaiDoanBanDem.has(giaiDoan));
}

export function laNguoiChoiMaSoi(danhSach,id,giaiDoan){
  return Boolean(giaiDoan&&giaiDoan!=='invite'&&giaiDoan!=='finished'&&danhSach?.some(nguoi=>nguoi.id===id));
}

export function laThanhVienVanMaSoi(danhSach,id){
  return Boolean(danhSach?.some(nguoi=>nguoi.id===id));
}

export function duocChonNangLucMaSoi(giaiDoan,loaiRieng){
  return giaiDoan==='night-role'&&loaiRieng==='role';
}
