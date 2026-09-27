# Demo profile portraits

`people/<id>.jpg` are 144 professional headshots used for every fictional demo person: 48 South Asian women (`sa-w-01`–`48`), 48 South Asian men (`sa-m-01`–`48`), 24 international women (`in-w-01`–`24`) and 24 international men (`in-m-01`–`24`). Each is a 1080 × 1080 JPEG (Full HD 1080p, square, about 160 KB) with a 256 × 256 copy of the same crop in `people/thumbs/`. Avatars up to 96 dp use the thumbnail and larger views use the HD file. All files are bundled, so they work offline.

The photos are free Unsplash photos used under the [Unsplash License](https://unsplash.com/license): free for commercial use, attribution not required. Paid Unsplash+ images were excluded. The names, roles and records attached to them in the app are fictional and make no claims about the people pictured. Credits are listed below and in `src/shared/people/portraitPool.json`.

Selection standard: one adult per photo, a different person in every file, business or business-casual attire, a clean or softly blurred background, and no text, logos or sunglasses. Framing is a head-and-shoulders crop from Unsplash's face-area crop (`fit=facearea`) and is never upscaled. `scripts/portraits/*.json` records the source photo and exact crop for each ID. `node scripts/prepare-demo-portraits.cjs` merges those manifests into the pool, and `--download` refetches every file. After changing the pool, run `npm run portraits:assign` (see README.md, Person portraits).

`e1001.jpg`, `e1002.jpg`, `e1003.jpg` and `v2001.jpg` (128 px, from [Random User](https://randomuser.me/photos)) and the images embedded in the sample surveillance records are legacy demo identifiers. The app shows the person's pool portrait in their place.

## Credits

| ID | Photographer | Photo |
| --- | --- | --- |
| sa-w-01 | [ThisisEngineering](https://unsplash.com/@thisisengineering) | [Unsplash](https://unsplash.com/photos/woman-in-black-and-white-floral-dress-standing-on-white-floor-Bt9HIKC0Nus) |
| sa-w-02 | [Skytech Aviation](https://unsplash.com/@skytechaviation0) | [Unsplash](https://unsplash.com/photos/woman-in-lime-green-suit-standing-outdoors-FV07AEZZSrE) |
| sa-w-03 | [Fotos](https://unsplash.com/@fotospk) | [Unsplash](https://unsplash.com/photos/a-woman-with-long-hair-JuFMEBErZrw) |
| sa-w-04 | [EqualStock](https://unsplash.com/@equalstock) | [Unsplash](https://unsplash.com/photos/a-woman-works-at-her-computer-smiling-PzBJl7c_vU4) |
| sa-w-05 | [Abhaya Behera](https://unsplash.com/@abhaya) | [Unsplash](https://unsplash.com/photos/a-young-woman-in-a-pink-shirt-smiles-outdoors-_qiS7hqU0jA) |
| sa-w-06 | [chayan purkait](https://unsplash.com/@iam_chayan__) | [Unsplash](https://unsplash.com/photos/woman-in-black-suit-sitting-on-chair-9G69oOvbvu8) |
| sa-w-07 | [Vishwanath Negi](https://unsplash.com/@uk11photography) | [Unsplash](https://unsplash.com/photos/a-woman-standing-in-front-of-a-brown-background-mKUmiAzBK54) |
| sa-w-08 | [SUSHMITA NAG](https://unsplash.com/@susnag) | [Unsplash](https://unsplash.com/photos/a-person-holding-a-tablet-7kfZs8BGDVU) |
| sa-w-09 | [Naeem Ad](https://unsplash.com/@mnaeemad) | [Unsplash](https://unsplash.com/photos/a-woman-standing-in-front-of-a-white-wall-3lWiAFCgjPw) |
| sa-w-10 | [Skytech Aviation](https://unsplash.com/@skytechaviation0) | [Unsplash](https://unsplash.com/photos/a-woman-sits-on-a-sofa-in-an-office-FQ470_Ofjjo) |
| sa-w-11 | [nikhil uttam](https://unsplash.com/@nikutm) | [Unsplash](https://unsplash.com/photos/woman-in-blue-and-white-floral-long-sleeve-shirt-VZzgytBdUgk) |
| sa-w-12 | [Parimal Jain](https://unsplash.com/@parimaljain) | [Unsplash](https://unsplash.com/photos/woman-in-red-patterned-sweater-x-A4O_92fr8) |
| sa-w-13 | [Dhruv vishwakarma](https://unsplash.com/@dhruva15) | [Unsplash](https://unsplash.com/photos/a-woman-in-a-sari-sits-by-a-pillar-z4kuB2QoQkM) |
| sa-w-14 | [Fotos](https://unsplash.com/@fotospk) | [Unsplash](https://unsplash.com/photos/a-person-wearing-glasses-rSveegrQvqU) |
| sa-w-15 | [EqualStock](https://unsplash.com/@equalstock) | [Unsplash](https://unsplash.com/photos/a-woman-in-a-red-dress-standing-in-a-field-t8M0L7NmCcw) |
| sa-w-16 | [Shane Ryan Herilalaina](https://unsplash.com/@alekseyryan) | [Unsplash](https://unsplash.com/photos/woman-in-traditional-dress-stands-by-window-with-ocean-view-q7t9yqoLAlk) |
| sa-w-17 | [sidath vimukthi](https://unsplash.com/@sidathkc) | [Unsplash](https://unsplash.com/photos/a-woman-in-a-red-dress-standing-in-front-of-a-building-4LPQYs2EXsk) |
| sa-w-18 | [Skytech Aviation](https://unsplash.com/@skytechaviation0) | [Unsplash](https://unsplash.com/photos/young-woman-in-uniform-standing-against-white-wall-qjNL5dbjm1Q) |
| sa-w-19 | [Subhra Jyoti Paul](https://unsplash.com/@sjpaul) | [Unsplash](https://unsplash.com/photos/a-woman-in-a-red-kurta-with-a-floral-scarf-c07j-zSHezM) |
| sa-w-20 | [kabir cheema](https://unsplash.com/@kabircheema) | [Unsplash](https://unsplash.com/photos/a-woman-standing-in-front-of-a-black-wall-TK-2oIgKXQ4) |
| sa-w-21 | [Rupinder Singh](https://unsplash.com/@singhrupinder) | [Unsplash](https://unsplash.com/photos/a-woman-in-a-red-coat-posing-for-a-picture-Ye4D_TIi82E) |
| sa-w-22 | [Arnob Sadi](https://unsplash.com/@mrsadi) | [Unsplash](https://unsplash.com/photos/a-woman-sitting-on-a-boat-in-the-water-20KJuXb0Ouo) |
| sa-w-23 | [arfa ajaz](https://unsplash.com/@a_a_gallery) | [Unsplash](https://unsplash.com/photos/mens-black-and-blue-traditional-indian-dress-scVWTdksX3g) |
| sa-w-24 | [Rejaul Karim](https://unsplash.com/@rejaul_creativedesign) | [Unsplash](https://unsplash.com/photos/young-woman-standing-outdoors-near-a-wooden-fence-Akugnc8ROwg) |
| sa-w-25 | [IMANA](https://unsplash.com/@imanaindia) | [Unsplash](https://unsplash.com/photos/woman-in-patterned-tunic-and-wide-leg-pants-f_9EmLmQYCE) |
| sa-w-26 | [manish_ jadhav_photography05](https://unsplash.com/@mjphotography05) | [Unsplash](https://unsplash.com/photos/a-woman-standing-in-front-of-a-house-w4wnhRYjGnw) |
| sa-w-27 | [Photogramy studio](https://unsplash.com/@photogramystudio) | [Unsplash](https://unsplash.com/photos/a-woman-in-an-orange-shirt-taQWraLsQqc) |
| sa-w-28 | [Skytech Aviation](https://unsplash.com/@skytechaviation0) | [Unsplash](https://unsplash.com/photos/a-smiling-woman-sits-at-a-desk-with-a-laptop-5k3VgWVyqbM) |
| sa-w-29 | [Muhammad Rizwan](https://unsplash.com/@riz_lahore) | [Unsplash](https://unsplash.com/photos/a-smiling-woman-in-a-purple-outfit-by-a-lake-C8NdDCIdPM8) |
| sa-w-30 | [ARTO SURAJ](https://unsplash.com/@artosuraj) | [Unsplash](https://unsplash.com/photos/a-woman-posing-for-a-picture-GzS_a_gWqj8) |
| sa-w-31 | [Skytech Aviation](https://unsplash.com/@skytechaviation0) | [Unsplash](https://unsplash.com/photos/a-woman-in-a-white-blazer-sits-at-a-desk-ueUYcRPXnXw) |
| sa-w-32 | [PRATEEK JAISWAL](https://unsplash.com/@prateekjaiswal) | [Unsplash](https://unsplash.com/photos/a-woman-in-a-blue-dress-standing-on-a-balcony-94exDkBIndc) |
| sa-w-33 | [Samrat Khadka](https://unsplash.com/@samrat_khadka) | [Unsplash](https://unsplash.com/photos/woman-wearing-red-floral-long-sleeved-top-311_eApQ-3Q) |
| sa-w-34 | [Skytech Aviation](https://unsplash.com/@skytechaviation0) | [Unsplash](https://unsplash.com/photos/a-woman-in-a-white-blazer-and-black-pants-smiles-hODuXSsWzjQ) |
| sa-w-35 | [Harsh Gupta](https://unsplash.com/@imharsh081) | [Unsplash](https://unsplash.com/photos/a-woman-in-an-orange-and-white-sari-N_wSbVTWnyk) |
| sa-w-36 | [Fotos](https://unsplash.com/@fotospk) | [Unsplash](https://unsplash.com/photos/a-woman-holding-a-pen-dFbdYMoyIGo) |
| sa-w-37 | [Gabriel Ogulu](https://unsplash.com/@ogulu_18) | [Unsplash](https://unsplash.com/photos/a-smiling-woman-with-glasses-looks-happy-yvoFKerRa88) |
| sa-w-38 | [Ofspace LLC](https://unsplash.com/@ofspace) | [Unsplash](https://unsplash.com/photos/a-woman-wearing-a-red-and-blue-scarf-0jL1GMH6hBc) |
| sa-w-39 | [Debojyoti Dutta](https://unsplash.com/@ddphotos01_) | [Unsplash](https://unsplash.com/photos/a-woman-wearing-a-black-and-red-sari-hFi37hDisGA) |
| sa-w-40 | [ARTO SURAJ](https://unsplash.com/@artosuraj) | [Unsplash](https://unsplash.com/photos/a-person-with-the-hands-up-CX_vKVJIc-I) |
| sa-w-41 | [Ashwini Chaudhary(Monty)](https://unsplash.com/@suicide_chewbacca) | [Unsplash](https://unsplash.com/photos/woman-wearing-black-blazer-standing-and-smiling-near-body-of-water-dmXQ81J_yI8) |
| sa-w-42 | [Shiv Narayan Das](https://unsplash.com/@20skid_) | [Unsplash](https://unsplash.com/photos/a-person-in-a-floral-dress-8ARnUPH6r7c) |
| sa-w-43 | [Anantha Krishnan](https://unsplash.com/@itsananthakrishnan) | [Unsplash](https://unsplash.com/photos/a-woman-in-a-green-dress-standing-in-the-woods-YMhiFK_KYCg) |
| sa-w-44 | [EqualStock](https://unsplash.com/@equalstock) | [Unsplash](https://unsplash.com/photos/woman-works-in-a-textile-factory-smiling-at-camera-5QKFgCPVHLg) |
| sa-w-45 | [nikhil uttam](https://unsplash.com/@nikutm) | [Unsplash](https://unsplash.com/photos/shallow-focus-photo-of-woman-in-pink-and-orange-floral-quarter-sleeved-shirt-2XXZZCEWXFk) |
| sa-w-46 | [Fotos](https://unsplash.com/@fotospk) | [Unsplash](https://unsplash.com/photos/a-person-holding-a-book-hpNKv8n9_pk) |
| sa-w-47 | [Vikash Sharma](https://unsplash.com/@vikashsparxit) | [Unsplash](https://unsplash.com/photos/a-woman-sitting-on-a-bench-in-front-of-a-tree-_yTWDiOs7Is) |
| sa-w-48 | [Chris](https://unsplash.com/@chris_ainsworth22) | [Unsplash](https://unsplash.com/photos/woman-in-black-and-white-plaid-blazer-Av4gNsllkyU) |
| sa-m-01 | [Yogendra Singh](https://unsplash.com/@yogendras31) | [Unsplash](https://unsplash.com/photos/man-in-black-suit-jacket-smiling-HrpYHchKb5Y) |
| sa-m-02 | [Vishal Kampani](https://unsplash.com/@vishalkampani) | [Unsplash](https://unsplash.com/photos/a-man-in-a-suit-stands-in-an-office-hallway-wDI32vR1hCs) |
| sa-m-03 | [Josias Garibay](https://unsplash.com/@josiasegl) | [Unsplash](https://unsplash.com/photos/a-smiling-young-man-in-a-dark-blue-sweater-rifCUO-4X8k) |
| sa-m-04 | [Swag Photography](https://unsplash.com/@arni_gill) | [Unsplash](https://unsplash.com/photos/man-in-brown-coat-and-beige-pants-standing-on-brown-field-during-daytime-WiUmJcVcpR4) |
| sa-m-05 | [Srini Vasan](https://unsplash.com/@srinic26) | [Unsplash](https://unsplash.com/photos/man-in-business-attire-is-smiling-dIQflTeJoXA) |
| sa-m-06 | [Sairaj Gandhe](https://unsplash.com/@sairajgandhe28) | [Unsplash](https://unsplash.com/photos/a-young-man-in-a-blue-shirt-with-crossed-arms-H43Gn5Nx5xM) |
| sa-m-07 | [litoon dev](https://unsplash.com/@litoondev) | [Unsplash](https://unsplash.com/photos/older-man-in-light-blue-shirt-_qsNSM2HAb0) |
| sa-m-08 | [Vitaly Gariev](https://unsplash.com/@silverkblack) | [Unsplash](https://unsplash.com/photos/man-with-beard-in-suit-HVDQwIqv0sQ) |
| sa-m-09 | [litoon dev](https://unsplash.com/@litoondev) | [Unsplash](https://unsplash.com/photos/a-man-in-a-white-outfit-sitting-in-a-chair-z_SZesJ34FU) |
| sa-m-10 | [litoon dev](https://unsplash.com/@litoondev) | [Unsplash](https://unsplash.com/photos/man-in-white-shirt-holding-a-suit-jacket-R1R5gxGM-h8) |
| sa-m-11 | [Kamal Dharma Teja Dasari](https://unsplash.com/@dharma632) | [Unsplash](https://unsplash.com/photos/a-smiling-man-wearing-glasses-and-a-suit-jacket-zXR0fNWHDDQ) |
| sa-m-12 | [khaled elshamy](https://unsplash.com/@khaled_elshamy20) | [Unsplash](https://unsplash.com/photos/a-smiling-man-with-arms-crossed-against-a-dark-background-jEUN6xgbFxc) |
| sa-m-13 | [Faraz Ghori](https://unsplash.com/@ghorifaraz) | [Unsplash](https://unsplash.com/photos/a-man-with-a-mustache-and-a-white-shirt-ZrdfMqs9tJ4) |
| sa-m-14 | [syful islam](https://unsplash.com/@isyful4) | [Unsplash](https://unsplash.com/photos/a-man-holding-a-laptop-computer-in-his-hand-xTH8nlXEGAg) |
| sa-m-15 | [Sushanta Rokka](https://unsplash.com/@sanoyatra) | [Unsplash](https://unsplash.com/photos/a-man-in-a-grey-suit-and-tie-stands-outdoors-uF8R5aDH7_c) |
| sa-m-16 | [Kazi Mizan](https://unsplash.com/@kaziminmizan) | [Unsplash](https://unsplash.com/photos/a-man-with-a-beard-and-glasses-standing-in-front-of-a-lamp-kz2w_rdhQsc) |
| sa-m-17 | [Sedk Mahmoud](https://unsplash.com/@sedyqtr) | [Unsplash](https://unsplash.com/photos/man-in-black-button-up-shirt-HMny8cYPl4Y) |
| sa-m-18 | [Ratul Puri](https://unsplash.com/@ratulpuri) | [Unsplash](https://unsplash.com/photos/a-man-in-a-suit-poses-in-an-office-xQLiFkWCSvM) |
| sa-m-19 | [Qasim Malick](https://unsplash.com/@qasimmalick) | [Unsplash](https://unsplash.com/photos/a-man-with-a-mustache-bRUBPkpluf4) |
| sa-m-20 | [Skytech Aviation](https://unsplash.com/@skytechaviation0) | [Unsplash](https://unsplash.com/photos/man-in-suit-sitting-at-desk-with-laptop-and-coffee-kgc1vAw1Tl8) |
| sa-m-21 | [ARTO SURAJ](https://unsplash.com/@artosuraj) | [Unsplash](https://unsplash.com/photos/a-man-in-a-white-shirt-smiling-for-the-camera-a26KbF2Mz1I) |
| sa-m-22 | [Ofspace LLC](https://unsplash.com/@ofspace) | [Unsplash](https://unsplash.com/photos/a-man-with-his-arms-crossed-smiling-I47ttCojsbU) |
| sa-m-23 | [Centre for Ageing Better](https://unsplash.com/@ageing_better) | [Unsplash](https://unsplash.com/photos/a-man-in-a-turban-standing-on-the-side-of-the-road-t11RsZ7Vss4) |
| sa-m-24 | [ArrN Capture](https://unsplash.com/@arrn) | [Unsplash](https://unsplash.com/photos/man-in-blue-and-white-dress-shirt-and-black-pants-jctvi30MWRM) |
| sa-m-25 | [NONRESIDENT](https://unsplash.com/@nonresident) | [Unsplash](https://unsplash.com/photos/man-in-blue-suit-jacket-wearing-eyeglasses-lKo6nsSoes8) |
| sa-m-26 | [Ashwini Chaudhary(Monty)](https://unsplash.com/@suicide_chewbacca) | [Unsplash](https://unsplash.com/photos/man-in-white-dress-shirt-fvm4bFVK7qM) |
| sa-m-27 | [Rowen Smith](https://unsplash.com/@hellosmith) | [Unsplash](https://unsplash.com/photos/a-man-sitting-on-a-bench-with-a-mountain-in-the-background-WGOtMqi7UtY) |
| sa-m-28 | [LUCAS SILVA](https://unsplash.com/@madruguinha176) | [Unsplash](https://unsplash.com/photos/man-in-suit-holding-phone-at-desk-with-laptop-JtwF1Kyi7ao) |
| sa-m-29 | [Jay Bhadreshwara](https://unsplash.com/@bhadreshwara) | [Unsplash](https://unsplash.com/photos/a-man-standing-in-front-of-a-brick-building-V0M9Gf4PByI) |
| sa-m-30 | [Hafiz Ahmed Zafar](https://unsplash.com/@hafizahmedzafar) | [Unsplash](https://unsplash.com/photos/man-in-grey-suit-and-tie-W2guFHJ7TlM) |
| sa-m-31 | [Vitaly Gariev](https://unsplash.com/@silverkblack) | [Unsplash](https://unsplash.com/photos/man-with-glasses-and-long-hair-in-office-H4XrY49eEZs) |
| sa-m-32 | [Fotos](https://unsplash.com/@fotospk) | [Unsplash](https://unsplash.com/photos/a-man-in-a-suit-and-tie-posing-for-a-picture-60h0RVggjwg) |
| sa-m-33 | [Prateek Saxena](https://unsplash.com/@prateek_sxn) | [Unsplash](https://unsplash.com/photos/a-smiling-man-in-a-jacket-and-shirt-t8FxhCjGYF8) |
| sa-m-34 | [JAIME CUADRA](https://unsplash.com/@jaimecuadra) | [Unsplash](https://unsplash.com/photos/man-in-black-button-up-shirt-wearing-eyeglasses-jgwYlo8ufRw) |
| sa-m-35 | [Noman Khan](https://unsplash.com/@nomankhannn) | [Unsplash](https://unsplash.com/photos/a-man-in-a-suit-standing-with-his-hands-in-his-pockets-Mt-hYU6M3ZM) |
| sa-m-36 | [Rohit Reddy](https://unsplash.com/@reddyrohit) | [Unsplash](https://unsplash.com/photos/man-crossing-arms-Wv_-0F0JiD8) |
| sa-m-37 | [Ahmed Sheraz](https://unsplash.com/@sheraz_official__) | [Unsplash](https://unsplash.com/photos/a-man-in-a-suit-standing-in-front-of-a-palm-tree-0mYnirxocC8) |
| sa-m-38 | [Priyanshu Mishra](https://unsplash.com/@priyanshumishraofficial27) | [Unsplash](https://unsplash.com/photos/man-in-a-dark-blue-shirt-with-arms-crossed-U35sYOMjikg) |
| sa-m-39 | [Fotos](https://unsplash.com/@fotospk) | [Unsplash](https://unsplash.com/photos/a-man-standing-in-front-of-a-yellow-background-X7fjU-p6gLQ) |
| sa-m-40 | [NAFIS HASAN](https://unsplash.com/@nfsbd) | [Unsplash](https://unsplash.com/photos/a-young-man-in-a-dark-blue-kurta-stands-outdoors--AzI1T0AtEQ) |
| sa-m-41 | [Dipak Tolani](https://unsplash.com/@devbatra123) | [Unsplash](https://unsplash.com/photos/a-man-in-a-suit-standing-in-front-of-a-building-bWHiQMLUxso) |
| sa-m-42 | [Uvais Ur Rehman](https://unsplash.com/@uvaisurrehman) | [Unsplash](https://unsplash.com/photos/man-in-white-and-brown-plaid-dress-shirt-NWP0AyT0VbY) |
| sa-m-43 | [Fotos](https://unsplash.com/@fotospk) | [Unsplash](https://unsplash.com/photos/a-man-in-a-suit-with-his-arms-crossed-T_p4HhTdbeo) |
| sa-m-44 | [Gabriel Ogulu](https://unsplash.com/@ogulu_18) | [Unsplash](https://unsplash.com/photos/smiling-man-in-front-of-a-university-building-OHCbaTVV0P8) |
| sa-m-45 | [Abdullah Arain](https://unsplash.com/@abdullaharain) | [Unsplash](https://unsplash.com/photos/a-man-wearing-a-white-shirt-and-a-brown-tie-n33SPfAHatw) |
| sa-m-46 | [Fotos](https://unsplash.com/@fotospk) | [Unsplash](https://unsplash.com/photos/a-man-with-his-arms-crossed-Kr-B0SOgD_4) |
| sa-m-47 | [Mediamodifier](https://unsplash.com/@mediamodifier) | [Unsplash](https://unsplash.com/photos/a-man-in-a-suit-and-tie-holding-a-tablet-evPdtS11X_s) |
| sa-m-48 | [Ofspace LLC](https://unsplash.com/@ofspace) | [Unsplash](https://unsplash.com/photos/a-man-with-a-beard-and-a-blue-shirt-e2-xl6voQ58) |
| in-w-01 | [DarceyStone Photography](https://unsplash.com/@darceystone) | [Unsplash](https://unsplash.com/photos/a-woman-with-her-arms-crossed-standing-in-front-of-a-building-KmRM8RkL2ZI) |
| in-w-02 | [Vitaly Gariev](https://unsplash.com/@silverkblack) | [Unsplash](https://unsplash.com/photos/a-smiling-woman-with-glasses-in-an-office-APjRQ59peUg) |
| in-w-03 | [Joecalih](https://unsplash.com/@joecalih) | [Unsplash](https://unsplash.com/photos/a-young-professional-woman-smiling-against-a-white-background-1l6UeCc9P9o) |
| in-w-04 | [Christina @ wocintechchat.com M](https://unsplash.com/@wocintechchat) | [Unsplash](https://unsplash.com/photos/woman-on-focus-photography-SJvDxw0azqw) |
| in-w-05 | [Emediong Umoh](https://unsplash.com/@official_umoh) | [Unsplash](https://unsplash.com/photos/a-woman-standing-in-front-of-a-mirror-_YI-Ximk-ok) |
| in-w-06 | [Tony Luginsland](https://unsplash.com/@tonyluginsland) | [Unsplash](https://unsplash.com/photos/a-woman-in-a-red-shirt-and-black-jacket-OswNOXPNU1k) |
| in-w-07 | [Phạm Duy Quang](https://unsplash.com/@phamduyquang) | [Unsplash](https://unsplash.com/photos/woman-in-grey-blazer-business-portrait-QGr6H7pri-Q) |
| in-w-08 | [Christina @ wocintechchat.com M](https://unsplash.com/@wocintechchat) | [Unsplash](https://unsplash.com/photos/smiling-woman-sitting-on-black-chair-kXmKqYOGA4Y) |
| in-w-09 | [Philip White](https://unsplash.com/@philipwhite) | [Unsplash](https://unsplash.com/photos/a-woman-standing-in-front-of-a-sculpture-O3D-teBz0Bg) |
| in-w-10 | [Sofia](https://unsplash.com/@insvezia) | [Unsplash](https://unsplash.com/photos/woman-in-white-dress-shirt-and-blue-denim-jeans-smiling-mQtcrK22CN8) |
| in-w-11 | [Christina @ wocintechchat.com M](https://unsplash.com/@wocintechchat) | [Unsplash](https://unsplash.com/photos/shallow-focus-photo-of-woman-in-gray-jacket-0Zx1bDv5BNY) |
| in-w-12 | [Jk Imperial](https://unsplash.com/@jkimperial) | [Unsplash](https://unsplash.com/photos/a-woman-with-short-hair-wearing-a-white-shirt-rtdd0Sb013k) |
| in-w-13 | [Abenezer Shewaga](https://unsplash.com/@abenezer_shewaga) | [Unsplash](https://unsplash.com/photos/a-woman-with-a-smile-on-her-face-21ckukPU3qA) |
| in-w-14 | [Tony Luginsland](https://unsplash.com/@tonyluginsland) | [Unsplash](https://unsplash.com/photos/a-person-with-a-grey-sweater-ZAo0cKz_IKM) |
| in-w-15 | [LinkedIn Sales Solutions](https://unsplash.com/@linkedinsalesnavigator) | [Unsplash](https://unsplash.com/photos/woman-in-orange-long-sleeve-shirt-sitting-on-chair-4nu1d0HYwAg) |
| in-w-16 | [Vitaly Gariev](https://unsplash.com/@silverkblack) | [Unsplash](https://unsplash.com/photos/woman-in-yellow-turtleneck-waving-hello-4BiAcxiCj_Y) |
| in-w-17 | [Dynamic Wang](https://unsplash.com/@dynamicwang) | [Unsplash](https://unsplash.com/photos/a-woman-in-a-pink-shirt-posing-for-a-picture-_JAAQZ2wt5I) |
| in-w-18 | [Christina @ wocintechchat.com M](https://unsplash.com/@wocintechchat) | [Unsplash](https://unsplash.com/photos/woman-in-white-dress-shirt-sw3FSL9hIoI) |
| in-w-19 | [Jonathan Borba](https://unsplash.com/@jonathanborba) | [Unsplash](https://unsplash.com/photos/smiling-woman-in-white-blazer-sitting-in-a-chair-4mUk_DFImbI) |
| in-w-20 | [lhon karwan](https://unsplash.com/@lhonkarwanhamasalih) | [Unsplash](https://unsplash.com/photos/a-woman-standing-in-the-middle-of-a-parking-lot-XGT7QuRgOsw) |
| in-w-21 | [Vitaly Gariev](https://unsplash.com/@silverkblack) | [Unsplash](https://unsplash.com/photos/a-woman-wearing-glasses-standing-in-front-of-a-bookshelf-1Ie0-EdPyi0) |
| in-w-22 | [TRAN NHU TUAN](https://unsplash.com/@kooldark) | [Unsplash](https://unsplash.com/photos/a-woman-in-a-business-suit-posing-for-a-picture-x7ksVaD2_VI) |
| in-w-23 | [Mrs Zazou](https://unsplash.com/@1like_pics) | [Unsplash](https://unsplash.com/photos/woman-in-black-blazer-sitting-on-concrete-bench-during-daytime-9Ex31S3eoRY) |
| in-w-24 | [Christina @ wocintechchat.com M](https://unsplash.com/@wocintechchat) | [Unsplash](https://unsplash.com/photos/smiling-woman-wearing-black-cardigan-N_HzomQQ6bc) |
| in-m-01 | [David Mumma](https://unsplash.com/@dmumma) | [Unsplash](https://unsplash.com/photos/a-man-in-a-suit-and-tie-posing-for-a-picture-aChQUTPMhkI) |
| in-m-02 | [Let hho](https://unsplash.com/@let_hho) | [Unsplash](https://unsplash.com/photos/a-man-in-a-suit-poses-confidently-cZPouvekO-I) |
| in-m-03 | [Olawale Munna](https://unsplash.com/@shattathecreator) | [Unsplash](https://unsplash.com/photos/a-man-in-a-suit-and-glasses-posing-for-a-picture-oXzyPakqsA0) |
| in-m-04 | [Diego Suarez](https://unsplash.com/@diegoesr) | [Unsplash](https://unsplash.com/photos/smiling-man-in-white-shirt-with-arms-crossed-VkdH0Eemwqs) |
| in-m-05 | [itay verchik](https://unsplash.com/@itayverchik) | [Unsplash](https://unsplash.com/photos/man-in-black-suit-jacket-YmQ8TrsieE4) |
| in-m-06 | [Md Ishak Rahman](https://unsplash.com/@mdishakrahman) | [Unsplash](https://unsplash.com/photos/man-in-blue-blazer-and-glasses-smiles-indoors-dZQR7xy_Kic) |
| in-m-07 | [Henry Lai](https://unsplash.com/@henrylaiphotography) | [Unsplash](https://unsplash.com/photos/man-in-teal-suit-jacket-smiling-dM8wBYi6rTI) |
| in-m-08 | [Veroll Sterling](https://unsplash.com/@veroll) | [Unsplash](https://unsplash.com/photos/man-in-black-turtleneck-sweater-AGlO2jlVE4c) |
| in-m-09 | [Julissa Capdevilla](https://unsplash.com/@juliedroz) | [Unsplash](https://unsplash.com/photos/man-smiling-and-holding-bridge-camera-g3F8NC0g1uc) |
| in-m-10 | [Emre ÇOBAN](https://unsplash.com/@emrecob) | [Unsplash](https://unsplash.com/photos/smiling-man-in-white-shirt-sitting-on-a-box-HUCH4Cn_38Y) |
| in-m-11 | [Jonathan Wilson](https://unsplash.com/@jonwilsonmft) | [Unsplash](https://unsplash.com/photos/a-man-in-a-blue-shirt-is-smiling-A_hJ5wTBi_c) |
| in-m-12 | [Lucas Law](https://unsplash.com/@lucaslaw__) | [Unsplash](https://unsplash.com/photos/man-in-black-suit-wearing-eyeglasses-WJSM6lgaN2c) |
| in-m-13 | [Ansspvt Titan](https://unsplash.com/@ansspvt) | [Unsplash](https://unsplash.com/photos/a-man-smiling-for-the-camera-_WHmeGzrqvs) |
| in-m-14 | [Kevin Quezada](https://unsplash.com/@kevinqa) | [Unsplash](https://unsplash.com/photos/man-in-suit-and-tie-sitting-against-dark-background-Q7SizBY8wGs) |
| in-m-15 | [Levi Meir Clancy](https://unsplash.com/@levimeirclancy) | [Unsplash](https://unsplash.com/photos/man-in-white-dress-shirt-wearing-red-and-white-hijab-ruWf1KGPPsY) |
| in-m-16 | [Spencer Russell](https://unsplash.com/@spencerrussell) | [Unsplash](https://unsplash.com/photos/man-in-grey-blazer-near-green-trees-during-daytime-Im9AbWu3EHc) |
| in-m-17 | [Zahir Namane](https://unsplash.com/@zahirnamane) | [Unsplash](https://unsplash.com/photos/man-in-blazer-and-turtleneck-hwc7eIQiTCE) |
| in-m-18 | [Bismark Owusu-Yeboah](https://unsplash.com/@admanbismc) | [Unsplash](https://unsplash.com/photos/man-in-gray-suit-sitting-on-brown-wooden-bench-WITFiacq6ck) |
| in-m-19 | [SoyBreno](https://unsplash.com/@soybrenofotografia) | [Unsplash](https://unsplash.com/photos/a-smiling-man-with-arms-crossed-against-a-light-background-qf7tjrVQ1Qo) |
| in-m-20 | [gokhan polat](https://unsplash.com/@go_pol) | [Unsplash](https://unsplash.com/photos/a-man-in-a-suit-leaning-against-a-wall-LWYBh7sq64g) |
| in-m-21 | [Acesso DesignerFlix](https://unsplash.com/@designerflix) | [Unsplash](https://unsplash.com/photos/a-man-in-a-blue-suit-sitting-in-a-chair-857QZOer6Ps) |
| in-m-22 | [aung swam nyi](https://unsplash.com/@aungswamnyi) | [Unsplash](https://unsplash.com/photos/a-man-standing-in-front-of-a-red-wall-N7FS78gfGgk) |
| in-m-23 | [Steward Masweneng](https://unsplash.com/@stewardesign) | [Unsplash](https://unsplash.com/photos/a-man-in-a-suit-and-tie-posing-for-a-picture-Ubh8aX2k9ew) |
| in-m-24 | [Humberto Chávez](https://unsplash.com/@betoframe) | [Unsplash](https://unsplash.com/photos/a-man-in-a-suit-standing-with-his-arms-crossed-F_CnS-8NlZQ) |
