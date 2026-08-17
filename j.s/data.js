// Sample Content Data
const sampleContent = {
  trending: [
    { id: 1, title: 'Stranger Things', year: 2016, rating: 95, genres: ['Sci-Fi', 'Horror', 'Drama'], image: 'https://image.tmdb.org/t/p/w500/5gzzkR7y3hnY8AD1wXjCnVlHba5.jpg', type: 'tv', age: '16+', duration: '4 Seasons', progress: 65, description: 'When a young boy disappears, his mother, a police chief and his friends must confront terrifying forces.' },
    { id: 2, title: 'The Witcher', year: 2019, rating: 91, genres: ['Fantasy', 'Action'], image: 'https://image.tmdb.org/t/p/w500/AeToxEYnX6p2x60E51V37Y8leB.jpg', type: 'tv', age: '16+', duration: '3 Seasons', progress: 0, description: 'Geralt of Rivia, a monster hunter, navigates a world where people often prove more wicked than beasts.' },
    { id: 3, title: 'Squid Game', year: 2021, rating: 88, genres: ['Thriller', 'Drama'], image: 'https://image.tmdb.org/t/p/w500/dDlEaFVStH1x3p5KXs2Vp5c2iIp.jpg', type: 'tv', age: '18+', duration: '1 Season', progress: 0, description: 'Hundreds of cash-strapped players accept a strange invitation to compete in children\'s games.' },
    { id: 4, title: 'Money Heist', year: 2017, rating: 92, genres: ['Crime', 'Thriller'], image: 'https://image.tmdb.org/t/p/w500/5P4f8XJd2ptVzB83SA401tBSm.jpg', type: 'tv', age: '16+', duration: '5 Parts', progress: 80, description: 'A group of very unusual robbers assault the Factory of Moneda and Timbre to carry out the most perfect robbery.' },
    { id: 5, title: 'Bridgerton', year: 2020, rating: 87, genres: ['Romance', 'Drama'], image: 'https://image.tmdb.org/t/p/w500/8p9cj0E3WgG9J146loYj2dQP7J.jpg', type: 'tv', age: '16+', duration: '3 Seasons', progress: 0, description: 'Wealth, lust, and betrayal set against the backdrop of Regency-era England.' },
    { id: 6, title: 'Ozark', year: 2017, rating: 93, genres: ['Crime', 'Drama'], image: 'https://image.tmdb.org/t/p/w500/zTijX6Xxm4s0m9M4KdL5Hjy5Ryd.jpg', type: 'tv', age: '18+', duration: '4 Seasons', progress: 45, description: 'A financial planner relocates his family to the Ozarks after a money-laundering scheme goes wrong.' }
  ],

  topRated: [
    { id: 11, title: 'The Shawshank Redemption', year: 1994, rating: 98, genres: ['Drama'], image: 'https://image.tmdb.org/t/p/w500/5KCVkau1H88OCRkWJ1gEf3Y7Fm.jpg', type: 'movie', age: '16+', duration: '2h 22m', description: 'Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.' },
    { id: 12, title: 'The Godfather', year: 1972, rating: 97, genres: ['Crime', 'Drama'], image: 'https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg', type: 'movie', age: '18+', duration: '2h 55m', description: 'The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son.' },
    { id: 13, title: 'Pulp Fiction', year: 1994, rating: 95, genres: ['Crime', 'Drama'], image: 'https://image.tmdb.org/t/p/w500/dM2w364MScsFG5g4g1ZDY7tENiS.jpg', type: 'movie', age: '18+', duration: '2h 34m', description: 'The lives of two mob hitmen, a boxer, a gangster and his wife intersect in four tales of violence and redemption.' },
    { id: 14, title: 'Inception', year: 2010, rating: 93, genres: ['Action', 'Sci-Fi'], image: 'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg', type: 'movie', age: '12+', duration: '2h 28m', description: 'A thief who steals corporate secrets through the use of dream-sharing technology.' },
    { id: 15, title: 'The Dark Knight', year: 2008, rating: 94, genres: ['Action', 'Crime'], image: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg', type: 'movie', age: '12+', duration: '2h 32m', description: 'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham.' },
    { id: 16, title: 'Fight Club', year: 1999, rating: 93, genres: ['Drama'], image: 'https://image.tmdb.org/t/p/w500/o22YJ7r8A7OYlXxvz42Q0Y222H.jpg', type: 'movie', age: '18+', duration: '2h 19m', description: 'An insomniac office worker and a devil-may-care soapmaker form an underground fight club.' }
  ],

  newReleases: [
    { id: 21, title: 'The Super Mario Bros. Movie', year: 2023, rating: 82, genres: ['Animation', 'Adventure'], image: 'https://image.tmdb.org/t/p/w500/qdB2O7j71An4y8Yf00T1s1EZKj5.jpg', type: 'movie', age: '7+', duration: '1h 32m', description: 'While working underground to fix a water main, Brooklyn plumbers Mario and brother Luigi are transported.' },
    { id: 22, title: 'John Wick 4', year: 2023, rating: 88, genres: ['Action', 'Crime'], image: 'https://image.tmdb.org/t/p/w500/vF87Jfe224dYs760x5uX3PTrK3B.jpg', type: 'movie', age: '18+', duration: '2h 49m', description: 'John Wick uncovers a path to defeating the High Table.' },
    { id: 23, title: 'Guardians Vol. 3', year: 2023, rating: 85, genres: ['Action', 'Adventure'], image: 'https://image.tmdb.org/t/p/w500/r2J02Z221e0P76Y57oL5n6gLMAE.jpg', type: 'movie', age: '12+', duration: '2h 30m', description: 'Still reeling from the loss of Gamora, Peter Quill rallies his team.' },
    { id: 24, title: 'Fast X', year: 2023, rating: 78, genres: ['Action', 'Adventure'], image: 'https://image.tmdb.org/t/p/w500/5gzzkR7y3hnY8AD1wXjCnVlHba5.jpg', type: 'movie', age: '12+', duration: '2h 21m', description: 'Dom Toretto and his family are targeted by the vengeful son of drug kingpin Hernan Reyes.' },
    { id: 25, title: 'Spider-Man: Across the Spider-Verse', year: 2023, rating: 91, genres: ['Animation', 'Action'], image: 'https://image.tmdb.org/t/p/w500/8VcBFLjkcDbd2ov2FRnH2vqIb2E.jpg', type: 'movie', age: '12+', duration: '2h 20m', description: 'Miles Morales catapults across the Multiverse.' }
  ],

  continueWatching: [
    { id: 1, title: 'Stranger Things', year: 2016, rating: 95, genres: ['Sci-Fi', 'Horror'], image: 'https://image.tmdb.org/t/p/w500/5gzzkR7y3hnY8AD1wXjCnVlHba5.jpg', type: 'tv', age: '16+', duration: '4 Seasons', progress: 65 },
    { id: 4, title: 'Money Heist', year: 2017, rating: 92, genres: ['Crime', 'Thriller'], image: 'https://image.tmdb.org/t/p/w500/5P4f8XJd2ptVzB83SA401tBSm.jpg', type: 'tv', age: '16+', duration: '5 Parts', progress: 80 },
    { id: 6, title: 'Ozark', year: 2017, rating: 93, genres: ['Crime', 'Drama'], image: 'https://image.tmdb.org/t/p/w500/zTijX6Xxm4s0m9M4KdL5Hjy5Ryd.jpg', type: 'tv', age: '18+', duration: '4 Seasons', progress: 45 },
    { id: 31, title: 'Wednesday', year: 2022, rating: 88, genres: ['Comedy', 'Fantasy'], image: 'https://image.tmdb.org/t/p/w500/8p9cj0E3WgG9J146loYj2dQP7J.jpg', type: 'tv', age: '12+', duration: '1 Season', progress: 30 },
    { id: 32, title: 'The Night Agent', year: 2023, rating: 78, genres: ['Action', 'Thriller'], image: 'https://image.tmdb.org/t/p/w500/5gzzkR7y3hnY8AD1wXjCnVlHba5.jpg', type: 'tv', age: '16+', duration: '1 Season', progress: 15 }
  ],

  onlyOnNetflix: [
    { id: 1, title: 'Stranger Things', year: 2016, rating: 95, genres: ['Sci-Fi', 'Horror'], image: 'https://image.tmdb.org/t/p/w500/5gzzkR7y3hnY8AD1wXjCnVlHba5.jpg', type: 'tv', age: '16+', duration: '4 Seasons', tag: 'NETFLIX ORIGINAL' },
    { id: 2, title: 'The Witcher', year: 2019, rating: 91, genres: ['Fantasy', 'Action'], image: 'https://image.tmdb.org/t/p/w500/AeToxEYnX6p2x60E51V37Y8leB.jpg', type: 'tv', age: '16+', duration: '3 Seasons', tag: 'NETFLIX ORIGINAL' },
    { id: 8, title: 'Arcane', year: 2021, rating: 97, genres: ['Animation', 'Action'], image: 'https://image.tmdb.org/t/p/w500/86r5p8cQA2b73t2j80X9Tt8kQJ.jpg', type: 'tv', age: '12+', duration: '1 Season', tag: 'NETFLIX ORIGINAL' },
    { id: 31, title: 'Wednesday', year: 2022, rating: 88, genres: ['Comedy', 'Fantasy'], image: 'https://image.tmdb.org/t/p/w500/8p9cj0E3WgG9J146loYj2dQP7J.jpg', type: 'tv', age: '12+', duration: '1 Season', tag: 'NETFLIX ORIGINAL' },
    { id: 38, title: 'Extraction 2', year: 2023, rating: 85, genres: ['Action', 'Thriller'], image: 'https://image.tmdb.org/t/p/w500/5gzzkR7y3hnY8AD1wXjCnVlHba5.jpg', type: 'movie', age: '16+', duration: '2h 4m', tag: 'NETFLIX FILM' }
  ],

  upcoming: [
    { id: 44, title: 'The Crown S6', year: 2023, rating: 0, genres: ['Biography', 'Drama'], image: 'https://image.tmdb.org/t/p/w500/8p9cj0E3WgG9J146loYj2dQP7J.jpg', type: 'tv', age: '12+', duration: 'Coming Soon', releaseDate: 'Dec 2023' },
    { id: 45, title: 'One Piece Live Action', year: 2023, rating: 0, genres: ['Action', 'Adventure'], image: 'https://image.tmdb.org/t/p/w500/5gzzkR7y3hnY8AD1wXjCnVlHba5.jpg', type: 'tv', age: '12+', duration: 'Coming Soon', releaseDate: 'Aug 2023' },
    { id: 46, title: 'Rebel Moon', year: 2023, rating: 0, genres: ['Action', 'Sci-Fi'], image: 'https://image.tmdb.org/t/p/w500/rIp8g5F5Kd9b2JvX5Tj6jH2XKQA.jpg', type: 'movie', age: '16+', duration: 'Coming Soon', releaseDate: 'Dec 2023' },
    { id: 47, title: 'The Killer', year: 2023, rating: 0, genres: ['Action', 'Crime'], image: 'https://image.tmdb.org/t/p/w500/dM2w364MScsFG5g4g1ZDY7tENiS.jpg', type: 'movie', age: '18+', duration: 'Coming Soon', releaseDate: 'Nov 2023' },
    { id: 48, title: 'Squid Game S2', year: 2024, rating: 0, genres: ['Thriller', 'Drama'], image: 'https://image.tmdb.org/t/p/w500/dDlEaFVStH1x3p5KXs2Vp5c2iIp.jpg', type: 'tv', age: '18+', duration: 'Coming Soon', releaseDate: '2024' }
  ]
};

// My List State
let myList = JSON.parse(localStorage.getItem('myList')) || [];
let currentModalItem = null;