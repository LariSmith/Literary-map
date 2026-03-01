// script.js
document.addEventListener('DOMContentLoaded', () => {
    // Inicializa o mapa focado na Europa (ou num panorama geral onde as histórias acontecem)
    // Zoom inicial 4 para mostrar vários países de uma vez
    const map = L.map('map').setView([48.8566, 2.3522], 4);

    // Carrega um tile layer com aparência neutra ou antiga
    // O estilo CartoDB Voyager fica interessante com filtros CSS vintage
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);
    // Custom Icon (Alfinete)
    const detectiveIcon = L.divIcon({
        className: 'detective-pin',
        iconSize: [20, 30],
        iconAnchor: [10, 30],
        popupAnchor: [0, -35]
    });

    // Função para buscar dados do JSON e desenhar no mapa
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            // Ordenar por ordem de leitura
            data.sort((a, b) => a.readOrder - b.readOrder);

            const coordinatesArray = [];

            data.forEach((book, index) => {
                // Adiciona a coordenada ao array para desenhar a linha (cordinha vermelha)
                coordinatesArray.push(book.coordinates);

                // Cria o marcador
                const marker = L.marker(book.coordinates, { icon: detectiveIcon }).addTo(map);

                // Popups estilo anotações com o nome do livro e localização
                marker.bindPopup(`<b>${book.title}</b><br><small>${book.location}</small>`);
            });

            // Adicionar a "Cordinha Vermelha" ligando os pontos na ordem de leitura
            // Removido o traçado para parecer um fio liso de lã (conforme imagem de referência)
            // A classe 'red-string-svg' é adicionada para que o CSS crie a sombra 3D por fora do stroke
            const redString = L.polyline(coordinatesArray, {
                color: '#900000', /* Vermelho mais escuro e fechado como lã */
                weight: 5, /* Fio um pouco mais grosso */
                opacity: 0.9,
                className: 'red-string-svg', /* Classe customizada que trataremos no CSS */
                lineJoin: 'round',
                lineCap: 'round'
            }).addTo(map);

            // Ajusta o zoom do mapa para mostrar todos os pontos
            if (coordinatesArray.length > 0) {
                map.fitBounds(redString.getBounds(), { padding: [50, 50] });
            }
        })
        .catch(error => console.error('Erro ao carregar os dados dos livros:', error));
});
