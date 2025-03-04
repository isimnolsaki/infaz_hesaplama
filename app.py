from flask import Flask, render_template, request, jsonify
from datetime import datetime, date
import calendar

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
    else:
        infaz_suresi_metni = f"{ay} ay"
    
    return infaz_ay, infaz_suresi_metni, infaz_aciklamasi

def hesapla_infaz(data):
    """Tüm infaz hesaplamalarını yapar"""
    try:
        # Verileri al
        dogum_tarihi = data.get('dogum_tarihi', data.get('dogumTarihi'))
        suc_tarihi = data.get('suc_tarihi', data.get('sucTarihi'))
        kesinlesme_tarihi = data.get('kesinlesme_tarihi', data.get('kesinlesmeTarihi'))
        ceza_turu = data.get('ceza_turu', data.get('cezaTuru'))
        suc_turu = data.get('suc_turu', data.get('sucTuru'))
        ceza_yil = int(data.get('ceza_yil', data.get('cezaYil', 0)))
        ceza_ay = int(data.get('ceza_ay', data.get('cezaAy', 0)))
        cocuk_var = bool(data.get('cocuk_var', data.get('cocukVar', False)))
        agir_hastalik = bool(data.get('agir_hastalik', data.get('agirHastalik', False)))
        tekerrur = bool(data.get('tekerrur', data.get('tekerrur', False)))
        ikinci_mukerrir = bool(data.get('ikinci_mukerrir', data.get('ikinciMukerrir', False)))
        
        # Tarih kontrolü
        if not dogum_tarihi or not suc_tarihi:
            return {"error": "Doğum tarihi ve suç tarihi belirtilmelidir."}
            
        # Sonuç nesnesi
        sonuc = {
            'suc_tarihi': suc_tarihi,
            'kesinlesme_tarihi': kesinlesme_tarihi,
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
        
        # Tarih hesaplamaları: Kesinleşme tarihini başlangıç olarak alıp, gerçek tarihler hesaplama
        try:
            if kesinlesme_tarihi and ks_ay is not None:
                # Kesinleşme tarihini datetime nesnesine çevir
                kesinlesme_datetime = datetime.strptime(kesinlesme_tarihi, '%Y-%m-%d')
                kesinlesme_date = kesinlesme_datetime.date()
                
                # Koşullu salıverilme tarihi hesaplama
                try:
                    # Ay hesabı
                    toplam_ay = ks_ay
                    yil_ekle = toplam_ay // 12
                    ay_ekle = toplam_ay % 12
                    
                    # Yeni tarih hesabı
                    yeni_yil = kesinlesme_date.year + yil_ekle
                    yeni_ay = kesinlesme_date.month + ay_ekle
                    
                    # Ay taşması kontrolü
                    if yeni_ay > 12:
                        yeni_yil += 1
                        yeni_ay -= 12
                    
                    # Gün kontrolü (örneğin 31 Ocak -> 28/29 Şubat)
                    son_gun = calendar.monthrange(yeni_yil, yeni_ay)[1]
                    if kesinlesme_date.day > son_gun:
                        yeni_gun = son_gun
                    else:
                        yeni_gun = kesinlesme_date.day
                    
                    # Koşullu salıverilme tarihi
                    from datetime import date
                    ks_tarih = date(yeni_yil, yeni_ay, yeni_gun)
                    sonuc['kosullu_saliverilme_tarihi'] = ks_tarih.strftime('%d/%m/%Y')
                    
                    # Denetimli serbestlik tarihi hesaplama
                    if ds_ay > 0:
                        # Denetimli serbestlik için ay hesabı
                        ds_ay_geri = ds_ay
                        ds_yil_geri = ds_ay_geri // 12
                        ds_kalan_ay = ds_ay_geri % 12
                        
                        # Yıl hesabı
                        ds_yeni_yil = ks_tarih.year - ds_yil_geri
                        ds_yeni_ay = ks_tarih.month - ds_kalan_ay
                        
                        # Ay eksiye düşme kontrolü
                        if ds_yeni_ay <= 0:
                            ds_yeni_yil -= 1
                            ds_yeni_ay += 12
                        
                        # Gün kontrolü
                        ds_son_gun = calendar.monthrange(ds_yeni_yil, ds_yeni_ay)[1]
                        if ks_tarih.day > ds_son_gun:
                            ds_yeni_gun = ds_son_gun
                        else:
                            ds_yeni_gun = ks_tarih.day
                        
                        # Denetimli serbestlik tarihi
                        ds_tarih = date(ds_yeni_yil, ds_yeni_ay, ds_yeni_gun)
                        sonuc['denetimli_serbestlik_tarihi'] = ds_tarih.strftime('%d/%m/%Y')
                    else:
                        sonuc['denetimli_serbestlik_tarihi'] = "Denetimli serbestlik uygulanmaz"
                except Exception as e:
                    import traceback
                    sonuc['tarih_hesaplama_hatasi'] = str(e)
                    sonuc['hata_detay'] = traceback.format_exc()
                    sonuc['kosullu_saliverilme_tarihi'] = "Tarih hesaplanamadı"
                    sonuc['denetimli_serbestlik_tarihi'] = "Tarih hesaplanamadı"
            else:
                # Kesinleşme tarihi veya koşullu salıverilme süresi yoksa
                sonuc['kosullu_saliverilme_tarihi'] = "Tarih belirlenemedi"
                sonuc['denetimli_serbestlik_tarihi'] = "Tarih belirlenemedi"
        except Exception as e:
            import traceback
            sonuc['tarih_hesaplama_hatasi'] = str(e)
            sonuc['hata_detay'] = traceback.format_exc()
            sonuc['kosullu_saliverilme_tarihi'] = "Tarih hesaplanamadı"
            sonuc['denetimli_serbestlik_tarihi'] = "Tarih hesaplanamadı"
        
        return sonuc
    except Exception as e:
        import traceback
        return {
            "error": f"Hesaplama sırasında bir hata oluştu: {str(e)}",
            "hata_detay": traceback.format_exc()
        }

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/hesapla', methods=['POST'])
def hesapla():
    try:
        data = request.json
        sonuc = hesapla_infaz(data)
        return jsonify(sonuc)
    except Exception as e:
        import traceback
        return jsonify({
            "error": f"İstek işlenirken bir hata oluştu: {str(e)}",
            "hata_detay": traceback.format_exc()
        }), 500

if __name__ == '__main__':
    app.run(debug=True) 
