from flask import Flask, render_template, request, jsonify
from datetime import datetime, date

app = Flask(__name__)

def hesapla_yas(dogum_tarihi, suc_tarihi):
    """Suç tarihindeki yaşı hesaplar"""
    try:
        dogum = datetime.strptime(dogum_tarihi, '%Y-%m-%d')
        suc = datetime.strptime(suc_tarihi, '%Y-%m-%d')
        yas = suc.year - dogum.year
        if suc.month < dogum.month or (suc.month == dogum.month and suc.day < dogum.day):
            yas -= 1
        return yas
    except ValueError:
        return None

def kontrol_suc_tarihi(suc_tarihi):
    """Suç tarihinin 30/03/2020 öncesi olup olmadığını kontrol eder 
       (7242 sayılı yasa kapsamında Geçici Madde 6 için)"""
    try:
        suc_tarih = datetime.strptime(suc_tarihi, '%Y-%m-%d')
        covid_yasa_tarih = datetime.strptime('2020-03-30', '%Y-%m-%d')
        return suc_tarih < covid_yasa_tarih
    except ValueError:
        return False

def kontrol_istisna_suc(suc_turu):
    """Belirli özel suç türlerini kontrol eder"""
    istisna_suclar = [
        "Kasten Öldürme", 
        "Cinsel Dokunulmazlığa Karşı Suçlar", 
        "Uyuşturucu Ticareti", 
        "Terör Suçları",
        "Organize Suçlar"
    ]
    return suc_turu in istisna_suclar

def hesapla_denetimli_serbestlik_ay(suc_tarihi, ceza_turu, suc_turu, cocuk_var=False, agir_hastalik=False, toplam_ceza_ay=None, ikinci_mukerrir=False):
    """Denetimli serbestlik süresini ay olarak hesaplar"""
    # İkinci mükerrir denetimli serbestlik alamaz
    if ikinci_mukerrir:
        return 0
        
    # Ömür boyu hapis cezalarında denetimli serbestlik yoktur
    if ceza_turu in ["Müebbet Hapis", "Ağırlaştırılmış Müebbet"]:
        return 0
        
    # Toplam ceza 6 aydan az ise denetimli serbestlik yok
    if toplam_ceza_ay is not None and toplam_ceza_ay < 6:
        return 0
        
    # 30/03/2020 öncesi suçlarda denetimli serbestlik 1 yıl
    if kontrol_suc_tarihi(suc_tarihi):
        # Özel durumlarda ek 6 ay
        if cocuk_var or agir_hastalik:
            return 18  # 12 + 6 ay
        return 12  # Normal 12 ay
    
    # 30/03/2020 sonrası suçlarda denetimli serbestlik süresi:
    # İstisna suçlarda 1 yıl, diğer suçlarda 2 yıl (Pandemi sonrası düzenleme)
    if kontrol_istisna_suc(suc_turu):
        # Özel durumlarda ek 6 ay
        if cocuk_var or agir_hastalik:
            return 18  # 12 + 6 ay
        return 12  # Normal 12 ay
    else:
        # Özel durumlarda ek 6 ay
        if cocuk_var or agir_hastalik:
            return 30  # 24 + 6 ay
        return 24  # Normal 24 ay

def hesapla_denetimli_serbestlik(suc_tarihi, ceza_turu, suc_turu, cocuk_var=False, agir_hastalik=False, toplam_ceza_ay=None, ikinci_mukerrir=False):
    """Denetimli serbestlik tarihini hesaplar"""
    # Denetimli serbestlik süresini hesapla
    ds_ay = hesapla_denetimli_serbestlik_ay(suc_tarihi, ceza_turu, suc_turu, cocuk_var, agir_hastalik, toplam_ceza_ay, ikinci_mukerrir)
    
    # Denetimli serbestlik süresi metni
    if ds_ay == 0:
        if ceza_turu in ["Müebbet Hapis", "Ağırlaştırılmış Müebbet"]:
            ds_suresi_metni = "Ömür boyu hapis cezalarında denetimli serbestlik uygulanmaz."
        elif ikinci_mukerrir:
            ds_suresi_metni = "İkinci kez mükerrir olanlar denetimli serbestlik hükümlerinden yararlanamaz."
        elif toplam_ceza_ay is not None and toplam_ceza_ay < 6:
            ds_suresi_metni = "6 aydan az hapis cezalarında denetimli serbestlik uygulanmaz."
        else:
            ds_suresi_metni = "Denetimli serbestlik uygulanmaz"
    else:
        yil = ds_ay // 12
        ay = ds_ay % 12
        if yil > 0 and ay > 0:
            ds_suresi_metni = f"{yil} yıl {ay} ay"
        elif yil > 0:
            ds_suresi_metni = f"{yil} yıl"
        else:
            ds_suresi_metni = f"{ay} ay"
    
    return None, ds_ay, ds_suresi_metni

def hesapla_infaz_orani(ceza_turu, suc_turu, yas, tekerrur=False, ikinci_mukerrir=False):
    """İnfaz oranını hesaplar"""
    # İkinci kez mükerrir olan kişiler hakkında koşullu salıverilme hükümleri uygulanmaz (CGTİK 108/3)
    if ikinci_mukerrir:
        return 1.0, "Cezanın tamamı infaz edilir (CGTİK 108/3)"
    
    # Ağırlaştırılmış müebbet
    if ceza_turu == "Ağırlaştırılmış Müebbet":
        if tekerrur:
            return 0.0, "30 yıl (Tekerrür durumunda oran değişmez)"
        return 0.0, "30 yıl"
    
    # Müebbet hapis
    if ceza_turu == "Müebbet Hapis":
        # Terör suçları
        if suc_turu == "Terör Suçları":
            if tekerrur:
                return 0.0, "24 yıl (Tekerrür durumunda oran değişmez)"
            return 0.0, "24 yıl (Müebbet hapis - terör suçları)"
        
        # Diğer suçlar
        if tekerrur:
            return 0.0, "24 yıl (Tekerrür durumunda oran değişmez)"
        return 0.0, "24 yıl"
    
    # Süreli hapis
    # Yaş kontrolü
    if yas is not None and yas < 18:
        # 12-15 yaş
        if yas >= 12 and yas < 15:
            return 1/3, "1/3 (12-15 yaş)"
        # 15-18 yaş
        elif yas >= 15 and yas < 18:
            return 1/2, "1/2 (15-18 yaş)"
    
    # Terör suçları
    if suc_turu == "Terör Suçları":
        if tekerrur:
            return 3/4, "3/4 (Tekerrür - terör suçları)"
        return 3/4, "3/4 (Terör suçları)"
    
    # İstisna suçlar
    if kontrol_istisna_suc(suc_turu):
        if tekerrur:
            return 2/3, "2/3 (İstisna suçlar)"
        return 2/3, "2/3 (İstisna suçlar)"
    
    # Diğer suçlar
    if tekerrur:
        return 2/3, "2/3 (Tekerrür - diğer suçlar)"
    return 1/2, "1/2 (Diğer suçlar)"

def hesapla_kosullu_saliverilme(ceza_turu, suc_turu, yas, ceza_yil=None, ceza_ay=None, tekerrur=False, ikinci_mukerrir=False):
    """Koşullu salıverilme süresini hesaplar"""
    # İkinci kez mükerrir olanlar koşullu salıverilmeden yararlanamaz
    if ikinci_mukerrir:
        if ceza_turu in ["Müebbet Hapis", "Ağırlaştırılmış Müebbet"]:
            return None, None, "İkinci kez mükerrir olanlar koşullu salıverilme hükümlerinden yararlanamaz."
        
        # Süreli hapis için toplam ceza
        toplam_ay = (ceza_yil or 0) * 12 + (ceza_ay or 0)
        return toplam_ay, "Cezanın tamamı", "İkinci kez mükerrir olanlar koşullu salıverilme hükümlerinden yararlanamaz."
    
    # İnfaz oranını hesapla
    infaz_orani, infaz_aciklamasi = hesapla_infaz_orani(ceza_turu, suc_turu, yas, tekerrur, ikinci_mukerrir)
    
    # Ağırlaştırılmış müebbet
    if ceza_turu == "Ağırlaştırılmış Müebbet":
        yil = 30
        return yil * 12, f"{yil} yıl", infaz_aciklamasi
    
    # Müebbet hapis
    if ceza_turu == "Müebbet Hapis":
        yil = 24
        return yil * 12, f"{yil} yıl", infaz_aciklamasi
    
    # Süreli hapis
    # Toplam ceza hesabı
    toplam_ay = (ceza_yil or 0) * 12 + (ceza_ay or 0)
    
    # İnfaz süresini hesapla
    infaz_ay = round(toplam_ay * infaz_orani)
    
    # İnfaz süresi metni
    yil = infaz_ay // 12
    ay = infaz_ay % 12
    
    if yil > 0 and ay > 0:
        infaz_suresi_metni = f"{yil} yıl {ay} ay"
    elif yil > 0:
        infaz_suresi_metni = f"{yil} yıl"
    else:
        infaz_suresi_metni = f"{ay} ay"
    
    return infaz_ay, infaz_suresi_metni, infaz_aciklamasi

def hesapla_infaz(data):
    """Tüm infaz hesaplamalarını yapar"""
    # Verileri al
    dogum_tarihi = data.get('dogum_tarihi')
    suc_tarihi = data.get('suc_tarihi')
    ceza_turu = data.get('ceza_turu')
    suc_turu = data.get('suc_turu')
    ceza_yil = data.get('ceza_yil', 0)
    ceza_ay = data.get('ceza_ay', 0)
    cocuk_var = data.get('cocuk_var', False)
    agir_hastalik = data.get('agir_hastalik', False)
    tekerrur = data.get('tekerrur', False)
    ikinci_mukerrir = data.get('ikinci_mukerrir', False)
    
    # Sonuç nesnesi
    sonuc = {
        'suc_tarihi': suc_tarihi,
        'ceza_turu': ceza_turu,
        'suc_turu': suc_turu,
        'aciklamalar': []
    }
    
    # Yaş hesapla
    yas = hesapla_yas(dogum_tarihi, suc_tarihi)
    sonuc['yas'] = yas
    
    # COVID-19 (7242 sayılı yasa) kontrolü
    covid_oncesi = kontrol_suc_tarihi(suc_tarihi)
    
    if covid_oncesi:
        sonuc['aciklamalar'].append(
            "30/03/2020 tarihinden önce işlenen suçlar için 7242 sayılı yasa kapsamında ek denetimli serbestlik süreleri uygulanır."
        )
    
    # İstisna suç kontrolü
    istisna_suc = kontrol_istisna_suc(suc_turu)
    
    # Toplam ceza süresi (ay cinsinden)
    if ceza_turu == "Süreli Hapis":
        toplam_ceza_ay = (ceza_yil or 0) * 12 + (ceza_ay or 0)
        
        # Toplam ceza metni
        yil = ceza_yil or 0
        ay = ceza_ay or 0
        
        if yil > 0 and ay > 0:
            sonuc['toplam_ceza_metni'] = f"{yil} yıl {ay} ay"
        elif yil > 0:
            sonuc['toplam_ceza_metni'] = f"{yil} yıl"
        else:
            sonuc['toplam_ceza_metni'] = f"{ay} ay"
    else:
        toplam_ceza_ay = None
        sonuc['toplam_ceza_metni'] = ceza_turu
    
    # Özel durumlar için açıklamalar
    if cocuk_var:
        sonuc['aciklamalar'].append(
            "0-6 yaş aralığında çocuğu olan kadın hükümlüler için denetimli serbestlik süresine 6 ay ilave edilir."
        )
    
    if agir_hastalik:
        sonuc['aciklamalar'].append(
            "Ağır hastalık, engellilik veya ileri yaş durumunda denetimli serbestlik süresine 6 ay ilave edilir."
        )
    
    if tekerrur:
        sonuc['aciklamalar'].append(
            "Tekerrür (mükerrir) durumunda infaz oranı artırılır."
        )
    
    if ikinci_mukerrir:
        sonuc['aciklamalar'].append(
            "İkinci kez mükerrir olanlar koşullu salıverilme ve denetimli serbestlik hükümlerinden yararlanamaz. Cezanın tamamı infaz edilir."
        )
    
    # Koşullu salıverilme hesabı
    ks_ay, ks_suresi_metni, infaz_aciklamasi = hesapla_kosullu_saliverilme(
        ceza_turu, suc_turu, yas, ceza_yil, ceza_ay, tekerrur, ikinci_mukerrir
    )
    
    sonuc['kosullu_saliverilme_suresi_metni'] = ks_suresi_metni
    sonuc['infaz_orani'] = infaz_aciklamasi
    
    # Denetimli serbestlik hesabı
    ds_tarih, ds_ay, ds_suresi_metni = hesapla_denetimli_serbestlik(
        suc_tarihi, ceza_turu, suc_turu, cocuk_var, agir_hastalik, toplam_ceza_ay, ikinci_mukerrir
    )
    
    sonuc['denetimli_serbestlik_suresi_metni'] = ds_suresi_metni
    
    # Tarih hesaplamaları: Günümüzü başlangıç olarak alıp, tahmini tarihler hesaplama
    bugun = date.today()
    
    if ks_ay is not None:
        # Tahmini koşullu salıverilme tarihi
        try:
            ks_tarih = bugun.replace(year=bugun.year + (ks_ay // 12))
            kalan_ay = ks_ay % 12
            
            yeni_ay = bugun.month + kalan_ay
            if yeni_ay > 12:
                ks_tarih = ks_tarih.replace(year=ks_tarih.year + 1)
                yeni_ay = yeni_ay - 12
            
            ks_tarih = ks_tarih.replace(month=yeni_ay)
            
            # Ayın son gününü aşma kontrolü
            try:
                ks_tarih = ks_tarih.replace(day=bugun.day)
            except ValueError:
                # 31 günlük aydan 30 günlük aya geçiş gibi durumlarda
                ks_tarih = ks_tarih.replace(day=1)
                # Bir sonraki ayın ilk gününden bir gün öncesi
                if yeni_ay < 12:
                    next_month = ks_tarih.replace(month=yeni_ay+1)
                else:
                    next_month = ks_tarih.replace(year=ks_tarih.year+1, month=1)
                ks_tarih = next_month.replace(day=1) - datetime.timedelta(days=1)
            
            sonuc['kosullu_saliverilme_tarihi'] = ks_tarih.strftime('%d/%m/%Y')
            
            # Denetimli serbestlik tarihi hesabı (koşullu salıverilme tarihinden geriye)
            if ds_ay > 0:
                ds_tarih = ks_tarih
                
                # Ay hesabı
                yeni_ay = ds_tarih.month - (ds_ay % 12)
                yil_azalt = 0
                
                if yeni_ay <= 0:
                    yeni_ay = 12 + yeni_ay
                    yil_azalt += 1
                
                ds_tarih = ds_tarih.replace(
                    year=ds_tarih.year - (ds_ay // 12) - yil_azalt,
                    month=yeni_ay
                )
                
                # Ayın son gününü aşma kontrolü
                try:
                    ds_tarih = ds_tarih.replace(day=ks_tarih.day)
                except ValueError:
                    # 31 günlük aydan 30 günlük aya geçiş gibi durumlarda
                    if yeni_ay < 12:
                        next_month = ds_tarih.replace(month=yeni_ay+1)
                    else:
                        next_month = ds_tarih.replace(year=ds_tarih.year+1, month=1)
                    ds_tarih = next_month.replace(day=1) - datetime.timedelta(days=1)
                
                sonuc['denetimli_serbestlik_tarihi'] = ds_tarih.strftime('%d/%m/%Y')
        except Exception as e:
            sonuc['aciklamalar'].append(f"Tarih hesaplaması yapılırken bir hata oluştu: {str(e)}")
    
    return sonuc

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/hesapla', methods=['POST'])
def hesapla():
    data = request.json
    return jsonify(hesapla_infaz(data))

if __name__ == '__main__':
    app.run(debug=True) 