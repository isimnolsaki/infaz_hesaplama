// DOM yüklendikten sonra çalış
document.addEventListener('DOMContentLoaded', function() {
    // Form elementlerine erişim
    const form = document.getElementById('infazForm');
    const cezaTuruSelect = document.getElementById('cezaTuru');
    const sucTuruSelect = document.getElementById('sucTuru');
    const cezaSuresiDiv = document.getElementById('cezaSuresiDiv');
    const sonucDiv = document.getElementById('sonuc');
    const tekerrurCheckbox = document.getElementById('tekerrur');
    const ikinciMukerrirCheckbox = document.getElementById('ikinciMukerrir');
    
    // Ceza türü değişince ceza süresi alanını göster/gizle
    cezaTuruSelect.addEventListener('change', function() {
        if (this.value === 'Süreli Hapis') {
            cezaSuresiDiv.style.display = 'block';
        } else {
            cezaSuresiDiv.style.display = 'none';
        }
    });
    
    // İkinci mükerrir seçilince, normal tekerrür otomatik seçilsin
    ikinciMukerrirCheckbox.addEventListener('change', function() {
        if (this.checked) {
            tekerrurCheckbox.checked = true;
        }
    });
    
    // Form submit edildiğinde
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Değerleri al
        const dogumGun = document.getElementById('dogumGun').value;
        const dogumAy = document.getElementById('dogumAy').value;
        const dogumYil = document.getElementById('dogumYil').value;
        
        const sucGun = document.getElementById('sucGun').value;
        const sucAy = document.getElementById('sucAy').value;
        const sucYil = document.getElementById('sucYil').value;
        
        const cezaTuru = cezaTuruSelect.value;
        const sucTuru = sucTuruSelect.value;
        
        const cezaYil = document.getElementById('cezaYil').value || 0;
        const cezaAy = document.getElementById('cezaAy').value || 0;
        
        const cocukVar = document.getElementById('cocukVar').checked;
        const agirHastalik = document.getElementById('agirHastalik').checked;
        const tekerrur = tekerrurCheckbox.checked;
        const ikinciMukerrir = ikinciMukerrirCheckbox.checked;
        
        // Tarih formatı kontrolü
        if (!validateDate(dogumGun, dogumAy, dogumYil) || !validateDate(sucGun, sucAy, sucYil)) {
            alert("Lütfen geçerli bir tarih giriniz!");
            return;
        }
        
        // Ceza süresi kontrolü (süreli hapis için)
        if (cezaTuru === 'Süreli Hapis' && Number(cezaYil) === 0 && Number(cezaAy) === 0) {
            alert("Lütfen ceza süresini giriniz!");
            return;
        }
        
        // API'ye gönderilecek veriyi oluştur
        const data = {
            dogum_tarihi: `${dogumYil}-${padZero(dogumAy)}-${padZero(dogumGun)}`,
            suc_tarihi: `${sucYil}-${padZero(sucAy)}-${padZero(sucGun)}`,
            ceza_turu: cezaTuru,
            suc_turu: sucTuru,
            ceza_yil: Number(cezaYil),
            ceza_ay: Number(cezaAy),
            cocuk_var: cocukVar,
            agir_hastalik: agirHastalik,
            tekerrur: tekerrur,
            ikinci_mukerrir: ikinciMukerrir
        };
        
        // Hesaplama için API isteği gönder
        fetch('/hesapla', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(result => {
            displayResults(result);
        })
        .catch(error => {
            console.error('Hata:', error);
            sonucDiv.innerHTML = `
                <div class="alert alert-danger">
                    <h4>Hata!</h4>
                    <p>Hesaplama yapılırken bir hata oluştu. Lütfen daha sonra tekrar deneyiniz.</p>
                </div>
            `;
        });
    });
    
    // Sonuçları göster
    function displayResults(result) {
        let html = `
            <div class="card mb-4">
                <div class="card-header">Hesaplama Sonuçları</div>
                <div class="card-body">
        `;
        
        // Genel Bilgiler
        html += `
            <div class="result-section">
                <h4>Hükümlü Bilgileri</h4>
                <div class="row">
                    <div class="col-md-6">
                        <p><strong>Suç Tarihindeki Yaş:</strong> ${result.yas}</p>
                    </div>
                    <div class="col-md-6">
                        <p><strong>Suç Tarihi:</strong> ${formatDate(result.suc_tarihi)}</p>
                    </div>
                </div>
            </div>
        `;
        
        // Ceza Bilgileri
        html += `
            <div class="result-section">
                <h4>Ceza Bilgileri</h4>
                <div class="row">
                    <div class="col-md-6">
                        <p><strong>Ceza Türü:</strong> ${result.ceza_turu}</p>
                        <p><strong>Suç Türü:</strong> ${result.suc_turu}</p>
                    </div>
                    <div class="col-md-6">
                        <p><strong>Toplam Ceza:</strong> ${result.toplam_ceza_metni || 'Belirtilmemiş'}</p>
                        <p><strong>İnfaz Oranı:</strong> ${result.infaz_orani || 'Belirtilmemiş'}</p>
                    </div>
                </div>
            </div>
        `;
        
        // Koşullu Salıverilme
        html += `
            <div class="result-section">
                <h4>Koşullu Salıverilme Bilgileri</h4>
                <div class="row">
                    <div class="col-md-6">
                        <p><strong>Koşullu Salıverilme Tarihi:</strong> ${result.kosullu_saliverilme_tarihi || 'Hesaplanamadı'}</p>
                    </div>
                    <div class="col-md-6">
                        <p><strong>Koşullu Salıverilme İçin Yatılacak Süre:</strong> ${result.kosullu_saliverilme_suresi_metni || 'Hesaplanamadı'}</p>
                    </div>
                </div>
            </div>
        `;
        
        // Denetimli Serbestlik
        html += `
            <div class="result-section">
                <h4>Denetimli Serbestlik Bilgileri</h4>
                <div class="row">
                    <div class="col-md-6">
                        <p><strong>Denetimli Serbestlik Tarihi:</strong> ${result.denetimli_serbestlik_tarihi || 'Hesaplanamadı'}</p>
                    </div>
                    <div class="col-md-6">
                        <p><strong>Denetimli Serbestlik Süresi:</strong> ${result.denetimli_serbestlik_suresi_metni || 'Hesaplanamadı'}</p>
                    </div>
                </div>
            </div>
        `;
        
        // Ek Açıklamalar
        if (result.aciklamalar && result.aciklamalar.length > 0) {
            html += `
                <div class="result-section">
                    <h4>Önemli Açıklamalar</h4>
                    <ul class="mb-0">
            `;
            
            result.aciklamalar.forEach(aciklama => {
                html += `<li>${aciklama}</li>`;
            });
            
            html += `
                    </ul>
                </div>
            `;
        }
        
        html += `
                </div>
            </div>
        `;
        
        // Sonuç bölümünü güncelle
        sonucDiv.innerHTML = html;
        
        // Sonuç bölümüne kaydır
        sonucDiv.scrollIntoView({ behavior: 'smooth' });
    }
    
    // Yardımcı fonksiyonlar
    function validateDate(gun, ay, yil) {
        const g = Number(gun);
        const a = Number(ay);
        const y = Number(yil);
        
        if (isNaN(g) || isNaN(a) || isNaN(y)) {
            return false;
        }
        
        if (g < 1 || g > 31 || a < 1 || a > 12 || y < 1900 || y > 2100) {
            return false;
        }
        
        // Ay bazında gün kontrolü
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
}); 
