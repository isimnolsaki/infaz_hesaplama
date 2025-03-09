document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('infazForm');
    const cezaTuruSelect = document.getElementById('cezaTuru');
    const cezaSuresiDiv = document.getElementById('cezaSuresiDiv');
    const sonucDiv = document.getElementById('sonuc');
    
    // Ceza türü değişince ceza süresi alanını göster/gizle
    cezaTuruSelect.addEventListener('change', function() {
        if (this.value === 'Süreli Hapis') {
            cezaSuresiDiv.style.display = 'flex';
            document.getElementById('cezaYil').required = true;
            document.getElementById('cezaAy').required = true;
        } else {
            cezaSuresiDiv.style.display = 'none';
            document.getElementById('cezaYil').required = false;
            document.getElementById('cezaAy').required = false;
        }
    });
    
    // İkinci mükerrir seçilince tekerrür otomatik seçilsin
    document.getElementById('ikinciMukerrir').addEventListener('change', function() {
        if (this.checked) {
            document.getElementById('tekerrur').checked = true;
        }
    });

    // Form gönderilince
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Tarih değerlerini al
        const dogumGun = document.getElementById('dogumGun').value;
        const dogumAy = document.getElementById('dogumAy').value;
        const dogumYil = document.getElementById('dogumYil').value;
        const sucGun = document.getElementById('sucGun').value;
        const sucAy = document.getElementById('sucAy').value;
        const sucYil = document.getElementById('sucYil').value;
        const kesinlesmeGun = document.getElementById('kesinlesmeGun').value;
        const kesinlesmeAy = document.getElementById('kesinlesmeAy').value;
        const kesinlesmeYil = document.getElementById('kesinlesmeYil').value;

        // Tarih doğrulamaları
        if (!validateDate(dogumGun, dogumAy, dogumYil)) {
            alert('Lütfen geçerli bir doğum tarihi girin.');
            return;
        }

        if (!validateDate(sucGun, sucAy, sucYil)) {
            alert('Lütfen geçerli bir suç tarihi girin.');
            return;
        }

        if (!validateDate(kesinlesmeGun, kesinlesmeAy, kesinlesmeYil)) {
            alert('Lütfen geçerli bir kesinleşme tarihi girin.');
            return;
        }

        // Kesinleşme tarihi suç tarihinden önce olamaz
        const sucTarihi = new Date(sucYil, sucAy - 1, sucGun);
        const kesinlesmeTarihi = new Date(kesinlesmeYil, kesinlesmeAy - 1, kesinlesmeGun);
        
        if (kesinlesmeTarihi < sucTarihi) {
            alert('Kesinleşme tarihi, suç tarihinden önce olamaz.');
            return;
        }

        // Ceza türü kontrolü
        const cezaTuru = document.getElementById('cezaTuru').value;
        if (!cezaTuru) {
            alert('Lütfen bir ceza türü seçin.');
            return;
        }

        // Süreli hapis için ceza süresi kontrolü
        let cezaYil = document.getElementById('cezaYil').value || "0";
        let cezaAy = document.getElementById('cezaAy').value || "0";
        
        if (cezaTuru === 'Süreli Hapis' && parseInt(cezaYil) === 0 && parseInt(cezaAy) === 0) {
            alert('Lütfen ceza süresini girin.');
            return;
        }

        // Form verilerini topla
        const formData = {
            dogum_tarihi: `${dogumYil}-${padZero(dogumAy)}-${padZero(dogumGun)}`,
            suc_tarihi: `${sucYil}-${padZero(sucAy)}-${padZero(sucGun)}`,
            kesinlesme_tarihi: `${kesinlesmeYil}-${padZero(kesinlesmeAy)}-${padZero(kesinlesmeGun)}`,
            ceza_turu: cezaTuru,
            suc_turu: document.getElementById('sucTuru').value,
            ceza_yil: parseInt(cezaYil),
            ceza_ay: parseInt(cezaAy),
            cocuk_var: document.getElementById('cocukVar').checked,
            agir_hastalik: document.getElementById('agirHastalik').checked,
            tekerrur: document.getElementById('tekerrur').checked,
            ikinci_mukerrir: document.getElementById('ikinciMukerrir').checked
        };

        // Hesaplama yap ve sonuçları göster
        const sonuc = hesaplaInfaz(formData);
        displayResults(sonuc);
    });
    
    // Yardımcı fonksiyonlar
    function validateDate(gun, ay, yil) {
        const g = Number(gun);
        const a = Number(ay);
        const y = Number(yil);
        
        if (isNaN(g) || isNaN(a) || isNaN(y)) return false;
        if (g < 1 || g > 31 || a < 1 || a > 12 || y < 1900 || y > 2100) return false;
        
        const ayGunleri = [0, 31, (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        return g <= ayGunleri[a];
    }
    
    function padZero(num) {
        return num.toString().padStart(2, '0');
    }
    
    function formatDate(dateStr) {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    function hesaplaInfaz(data) {
        // Yaş hesapla
        const dogumTarihi = new Date(data.dogum_tarihi);
        const sucTarihi = new Date(data.suc_tarihi);
        const yas = sucTarihi.getFullYear() - dogumTarihi.getFullYear();

        // Sonuç nesnesi
        const sonuc = {
            suc_tarihi: data.suc_tarihi,
            kesinlesme_tarihi: data.kesinlesme_tarihi,
            ceza_turu: data.ceza_turu,
            suc_turu: data.suc_turu,
            aciklamalar: []
        };

       // Toplam ceza süresi (ay cinsinden)
// Toplam ceza süresi (ay cinsinden)
if (data.ceza_turu === "Süreli Hapis") {
    const yil = parseInt(data.ceza_yil) || 0;
    const ay = parseInt(data.ceza_ay) || 0;
    const toplamAy = yil * 12 + ay;
    sonuc.toplam_ceza_metni = `${yil} yıl ${ay} ay`;
    sonuc.toplam_ay = toplamAy;
} else {
    sonuc.toplam_ceza_metni = data.ceza_turu;
}
        // İnfaz oranı hesapla
        let infazOrani = 1/2; // Varsayılan oran
        let infazAciklamasi = "1/2 (Diğer suçlar)";

        // Yaş kontrolü
        if (yas < 18) {
            if (yas >= 12 && yas < 15) {
                infazOrani = 1/3;
                infazAciklamasi = "1/3 (12-15 yaş)";
            } else if (yas >= 15 && yas < 18) {
                infazOrani = 1/2;
                infazAciklamasi = "1/2 (15-18 yaş)";
            }
        }
        // Suç türü kontrolü
        else if (data.suc_turu === "Terör Suçları") {
            infazOrani = 3/4;
            infazAciklamasi = "3/4 (Terör suçları)";
        }
        // İstisna suçlar kontrolü
        else if (["Kasten Öldürme", "Cinsel Dokunulmazlığa Karşı Suçlar", "Uyuşturucu Ticareti"].includes(data.suc_turu)) {
            infazOrani = 2/3;
            infazAciklamasi = "2/3 (İstisna suçlar)";
        }

        // Tekerrür durumu
        if (data.tekerrur) {
            if (data.suc_turu === "Terör Suçları") {
                infazOrani = 3/4;
                infazAciklamasi = "3/4 (Tekerrür - terör suçları)";
            } else {
                infazOrani = 2/3;
                infazAciklamasi = "2/3 (Tekerrür)";
            }
        }

        // İkinci mükerrir durumu
        if (data.ikinci_mukerrir) {
            infazOrani = 1;
            infazAciklamasi = "Cezanın tamamı (İkinci kez mükerrir)";
            sonuc.aciklamalar.push("İkinci kez mükerrir olanlar koşullu salıverilme ve denetimli serbestlik hükümlerinden yararlanamaz.");
        }

        sonuc.infaz_orani = infazAciklamasi;

        // Koşullu salıverilme süresi hesapla
        if (data.ceza_turu === "Ağırlaştırılmış Müebbet") {
            sonuc.kosullu_saliverilme_suresi_metni = "30 yıl";
            sonuc.kosullu_saliverilme_ay = 360;
        } else if (data.ceza_turu === "Müebbet Hapis") {
            sonuc.kosullu_saliverilme_suresi_metni = "24 yıl";
            sonuc.kosullu_saliverilme_ay = 288;
        } else {
            const infazAy = Math.ceil(sonuc.toplam_ay * infazOrani);
            const yil = Math.floor(infazAy / 12);
            const ay = infazAy % 12;
            sonuc.kosullu_saliverilme_suresi_metni = yil > 0 ? 
                (ay > 0 ? `${yil} yıl ${ay} ay` : `${yil} yıl`) : 
                `${ay} ay`;
            sonuc.kosullu_saliverilme_ay = infazAy;
        }

        // Denetimli serbestlik süresi hesapla
        let denetimliAy = 0;
        if (!data.ikinci_mukerrir && data.ceza_turu === "Süreli Hapis" && sonuc.toplam_ay >= 6) {
            const sucTarihiObj = new Date(data.suc_tarihi);
            if (sucTarihiObj < new Date('2020-03-30')) {
                denetimliAy = 12;
                sonuc.aciklamalar.push("30/03/2020 tarihinden önce işlenen suçlarda denetimli serbestlik süresi 1 yıldır.");
            } else {
                if (["Terör Suçları", "Cinsel Dokunulmazlığa Karşı Suçlar", "Uyuşturucu Ticareti"].includes(data.suc_turu)) {
                    denetimliAy = 12;
                } else {
                    denetimliAy = 24;
                }
            }

            if (data.cocuk_var || data.agir_hastalik) {
                denetimliAy += 6;
                if (data.cocuk_var) {
                    sonuc.aciklamalar.push("0-6 yaş aralığında çocuğu olan kadın hükümlüler için denetimli serbestlik süresine 6 ay ilave edilir.");
                }
                if (data.agir_hastalik) {
                    sonuc.aciklamalar.push("Ağır hastalık veya yaş durumunda denetimli serbestlik süresine 6 ay ilave edilir.");
                }
            }
        }

        sonuc.denetimli_serbestlik_ay = denetimliAy;
        if (denetimliAy > 0) {
            const yil = Math.floor(denetimliAy / 12);
            const ay = denetimliAy % 12;
            sonuc.denetimli_serbestlik_suresi_metni = yil > 0 ? 
                (ay > 0 ? `${yil} yıl ${ay} ay` : `${yil} yıl`) : 
                `${ay} ay`;
        } else {
            sonuc.denetimli_serbestlik_suresi_metni = "Denetimli serbestlik uygulanmaz";
        }

        // Tarihleri hesapla
        const kesinlesmeTarihi = new Date(data.kesinlesme_tarihi);
        
        // Koşullu salıverilme tarihi
        const ksTarihi = new Date(kesinlesmeTarihi);
        ksTarihi.setMonth(ksTarihi.getMonth() + sonuc.kosullu_saliverilme_ay);
        sonuc.kosullu_saliverilme_tarihi = formatDate(ksTarihi.toISOString().split('T')[0]);

        // Denetimli serbestlik tarihi
        if (denetimliAy > 0) {
            const dsTarihi = new Date(ksTarihi);
            dsTarihi.setMonth(dsTarihi.getMonth() - denetimliAy);
            sonuc.denetimli_serbestlik_tarihi = formatDate(dsTarihi.toISOString().split('T')[0]);
        } else {
            sonuc.denetimli_serbestlik_tarihi = "Denetimli serbestlik uygulanmaz";
        }

        return sonuc;
    }

    function displayResults(sonuc) {
        let sonucHTML = `
            <div class="card">
                <div class="card-header">
                    <h4 class="mb-0">İnfaz Hesaplama Sonuçları</h4>
                </div>
                <div class="card-body">
                    <div class="mb-4">
                        <h5>Genel Bilgiler</h5>
                        <p><strong>Suç Tarihi:</strong> ${formatDate(sonuc.suc_tarihi)}</p>
                        <p><strong>Kesinleşme Tarihi:</strong> ${formatDate(sonuc.kesinlesme_tarihi)}</p>
                        <p><strong>Ceza Türü:</strong> ${sonuc.ceza_turu}</p>
                        <p><strong>Suç Türü:</strong> ${sonuc.suc_turu}</p>
                        ${sonuc.toplam_ceza_metni ? `<p><strong>Toplam Ceza:</strong> ${sonuc.toplam_ceza_metni}</p>` : ''}
                    </div>
                    
                    <div class="mb-4">
                        <h5>İnfaz Hesaplaması</h5>
                        <p><strong>İnfaz Oranı:</strong> ${sonuc.infaz_orani}</p>
                        <p><strong>Koşullu Salıverilme Süresi:</strong> ${sonuc.kosullu_saliverilme_suresi_metni}</p>
                        <p><strong>Koşullu Salıverilme Tarihi:</strong> ${sonuc.kosullu_saliverilme_tarihi}</p>
                    </div>
                    
                    <div class="mb-4">
                        <h5>Denetimli Serbestlik</h5>
                        <p><strong>Denetimli Serbestlik Süresi:</strong> ${sonuc.denetimli_serbestlik_suresi_metni}</p>
                        <p><strong>Denetimli Serbestlik Tarihi:</strong> ${sonuc.denetimli_serbestlik_tarihi}</p>
                    </div>
                    
                    ${sonuc.aciklamalar && sonuc.aciklamalar.length > 0 ? `
                        <div>
                            <h5>Önemli Notlar</h5>
                            <ul class="mb-0">
                                ${sonuc.aciklamalar.map(aciklama => `<li>${aciklama}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        sonucDiv.innerHTML = sonucHTML;
        sonucDiv.scrollIntoView({ behavior: 'smooth' });
    }
});