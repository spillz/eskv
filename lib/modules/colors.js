
//@ts-check

/**
 * Object representing RGBA value of a color
 */
export class Color extends Array {
    /**
     * Constructs a new RGBA value from red, green, blue and alpha values.
     * @param {number} r red value (0-255)
     * @param {number} g green value (0-255)
     * @param {number} b blue value (0-255)
     * @param {number} a alpha value (0-1) 
     */
    constructor(r=0, g=0, b=0, a=1) {
        super(4);
        this[0] = r;
        this[1] = g;
        this[2] = b;
        this[3] = a
    }
    /**
     * Creates a new Color object from a string
     * @param {string} colorName 
     * @returns {Color}
     */
    static fromString(colorName) {
        if(colorName===null) {
          return new Color(0,0,0,0);
        }
        if(colorName.startsWith("rgba(")) {
            // Use a regular expression to match the rgba values
            const match = colorName.match(/^rgba\((\d{1,3}%?),\s*(\d{1,3}%?),\s*(\d{1,3}%?),\s*([\d.]+)\)$/);

            // If the string doesn't match the rgba format, return white
            if (!match) throw Error(`Unkwown color string ${colorName}`);

            // Convert percentage RGB values to integers (if any)
            const r = match[1].endsWith('%') ? Math.round(parseInt(match[1])*255 / 100) : parseInt(match[1]);
            const g = match[2].endsWith('%') ? Math.round(parseInt(match[2])*255 / 100) : parseInt(match[2]);
            const b = match[3].endsWith('%') ? Math.round(parseInt(match[3])*255 / 100) : parseInt(match[3]);
            const a = parseFloat(match[4]);

            return new Color(r, g, b, a);
        }
        if(colorName.startsWith("rgb(")) {
            // Use a regular expression to match the rgba values
            const match = colorName.match(/^rgb\((\d{1,3}%?),\s*(\d{1,3}%?),\s*(\d{1,3}%?)\)$/);

            // If the string doesn't match the rgba format, return white
            if (!match) throw Error(`Unkwown color string ${colorName}`);

            // Convert percentage RGB values to integers (if any)
            const r = match[1].endsWith('%') ? Math.round(parseInt(match[1])*255 / 100) : parseInt(match[1]);
            const g = match[2].endsWith('%') ? Math.round(parseInt(match[2])*255 / 100) : parseInt(match[2]);
            const b = match[3].endsWith('%') ? Math.round(parseInt(match[3])*255 / 100) : parseInt(match[3]);

            return new Color(r, g, b, 1);
        }
        let [r,g,b] = colorLookup[colorName]["rgb"];
        return new Color(r,g,b,1)
    }
    /**
     * Return a CSS string representation for given RGBA values
     * @param {number} r red, 0 - 255
     * @param {number} g green, 0 - 255
     * @param {number} b blue, 0 - 255
     * @param {number} a alpha, 0 - 1
     * @returns {string} CSS string represenation of the color
     */
    static stringFromValues(r, g, b, a=1) {
        return `rgba(${Math.floor(r)},${Math.floor(g)},${Math.floor(b)},${a})`
    }
    /**
     * Return a CSS string representation of RGBA color for given HSV values
     * @param {number} h hue, 0-360
     * @param {number} s green, 0-100
     * @param {number} v blue, 0-100
     * @param {number} a alpha, 0 - 1
     * @returns {string} CSS string represenation of the color
     */
    static stringFromHSV(h, s, v, a=1) {
        return Color.fromHSV(h, s, v, a).toString();
    }

    /**
     * Returns a CSS string representation of this object
     * @returns {string} CSS string representation of this object
     */
    toString() {
        return `rgba(${this[0]},${this[1]},${this[2]},${this[3]})`
    }
    /**
     * 
     * @returns {[number, number, number]}
     */
    rgb() {
        //@ts-ignore
        return this.slice(0, 3);
    }
    /**
     * Mix this color with another in proportions specified by wgt
     * @param {Color} color Color to mix with
     * @param {number} wgt proportion the added color
     * @returns {Color}
     */
    mix(color, wgt) {
        return new Color(
            this[0]*(1-wgt)+color[0]*wgt,
            this[1]*(1-wgt)+color[1]*wgt,
            this[2]*(1-wgt)+color[2]*wgt,
            this[3]*(1-wgt)+color[3]*wgt
        )
    }
    /**
     * Scale the value of the color by a fixed proportion
     * @param {number} value proportion to scale RGB values by, 0-1 typically
     * @returns {Color}
     */
    scale(value) {
        return new Color(
            this[0]*value,
            this[1]*value,
            this[2]*value,
            this[3]
        )
    }
    toStringWithAlpha(alpha=1.0) {
        return `rgba(${this[0]},${this[1]},${this[2]},${alpha})`
    }
    /**
     * Return Color from Hue, Staturation, Value trio
     * @param {number} h hue (color) from 0 to 360
     * @param {number} s saturation (intensity) from 0 to 100
     * @param {number} v value (brightness) from 0 to 100
     * @param {number} a alpha value
     */
    static fromHSV(h, s, v, a=1) {
        h /= 360;
        s /= 100;
        v /= 100;
        
        let r = 0, g = 0, b = 0;
    
        let i = Math.floor(h * 6);
        let f = h * 6 - i;
        let p = v * (1 - s);
        let q = v * (1 - f * s);
        let t = v * (1 - (1 - f) * s);
    
        switch (i % 6) {
            case 0: r = v, g = t, b = p; break;
            case 1: r = q, g = v, b = p; break;
            case 2: r = p, g = v, b = t; break;
            case 3: r = p, g = q, b = v; break;
            case 4: r = t, g = p, b = v; break;
            case 5: r = v, g = p, b = q; break;
        }
    
        return new Color(Math.floor(r*255),Math.floor(g*255),Math.floor(b*255),a)
    }
    /**
     * Returns HSV + Alpha channel in an array
     * Value ranges: H - 0 to 360, S - 0 to 100, V - 0 to 100, A - 0 to 1
     * @returns {[number, number, number, number]}
     */
    toHSVA() {
        let [r,g,b,a] = this;
        // r/=255;
        // g/=255;
        // b/=255;
        let max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s, v = max;
        let d = max - min;
        s = max === 0 ? 0 : d / max;
        if (max!==min) {
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return [Math.floor(h * 360), Math.floor(s * 100), Math.floor(v * 100), a];        
    }
    /**@type {number} red value, 0-255 */
    get r() {
        return this[0];
    }
    /**@type {number} green value, 0-255 */
    get g() {
        return this[1];
    }
    /**@type {number} blue value, 0-255 */
    get b() {
        return this[2];
    }
    /**@type {number} alpha value, 0-1 */
    get a() {
        return this[3];
    }
    set r(val) {
        this[0] = val;
    }
    set g(val) {
        this[1] = val;
    }
    set b(val) {
        this[2] = val;
    }
    set a(val) {
        this[3] = val;
    }
}



export var colorLookup = {
    "air_force_blue_raf": {
      "name": "Air Force Blue (Raf)",
      "rgb": [93, 138, 168],
    },
    "air_force_blue_usaf": {
      "name": "Air Force Blue (Usaf)",
      "rgb": [0, 48, 143],
    },
    "air_superiority_blue": {
      "name": "Air Superiority Blue",
      "rgb": [114, 160, 193],
    },
    "alabama_crimson": {
      "name": "Alabama Crimson",
      "rgb": [163, 38, 56],
    },
    "alice_blue": {
      "name": "Alice Blue",
      "rgb": [240, 248, 255],
    },
    "alizarin_crimson": {
      "name": "Alizarin Crimson",
      "rgb": [227, 38, 54],
    },
    "alloy_orange": {
      "name": "Alloy Orange",
      "rgb": [196, 98, 16],
    },
    "almond": {
      "name": "Almond",
      "rgb": [239, 222, 205],
    },
    "amaranth": {
      "name": "Amaranth",
      "rgb": [229, 43, 80],
    },
    "amber": {
      "name": "Amber",
      "rgb": [255, 191, 0],
    },
    "amber_sae_ece": {
      "name": "Amber (Sae/Ece)",
      "rgb": [255, 126, 0],
    },
    "american_rose": {
      "name": "American Rose",
      "rgb": [255, 3, 62],
    },
    "amethyst": {
      "name": "Amethyst",
      "rgb": [153, 102, 204],
    },
    "android_green": {
      "name": "Android Green",
      "rgb": [164, 198, 57],
    },
    "anti_flash_white": {
      "name": "Anti-Flash White",
      "rgb": [242, 243, 244],
    },
    "antique_brass": {
      "name": "Antique Brass",
      "rgb": [205, 149, 117],
    },
    "antique_fuchsia": {
      "name": "Antique Fuchsia",
      "rgb": [145, 92, 131],
    },
    "antique_ruby": {
      "name": "Antique Ruby",
      "rgb": [132, 27, 45],
    },
    "antique_white": {
      "name": "Antique White",
      "rgb": [250, 235, 215],
    },
    "ao_english": {
      "name": "Ao (English)",
      "rgb": [0, 128, 0],
    },
    "apple_green": {
      "name": "Apple Green",
      "rgb": [141, 182, 0],
    },
    "apricot": {
      "name": "Apricot",
      "rgb": [251, 206, 177],
    },
    "aqua": {
      "name": "Aqua",
      "rgb": [0, 255, 255],
    },
    "aquamarine": {
      "name": "Aquamarine",
      "rgb": [127, 255, 212],
    },
    "army_green": {
      "name": "Army Green",
      "rgb": [75, 83, 32],
    },
    "arsenic": {
      "name": "Arsenic",
      "rgb": [59, 68, 75],
    },
    "arylide_yellow": {
      "name": "Arylide Yellow",
      "rgb": [233, 214, 107],
    },
    "ash_grey": {
      "name": "Ash Grey",
      "rgb": [178, 190, 181],
    },
    "asparagus": {
      "name": "Asparagus",
      "rgb": [135, 169, 107],
    },
    "atomic_tangerine": {
      "name": "Atomic Tangerine",
      "rgb": [255, 153, 102],
    },
    "auburn": {
      "name": "Auburn",
      "rgb": [165, 42, 42],
    },
    "aureolin": {
      "name": "Aureolin",
      "rgb": [253, 238, 0],
    },
    "aurometalsaurus": {
      "name": "Aurometalsaurus",
      "rgb": [110, 127, 128],
    },
    "avocado": {
      "name": "Avocado",
      "rgb": [86, 130, 3],
    },
    "azure": {
      "name": "Azure",
      "rgb": [0, 127, 255],
    },
    "azure_mist_web": {
      "name": "Azure Mist/Web",
      "rgb": [240, 255, 255],
    },
    "baby_blue": {
      "name": "Baby Blue",
      "rgb": [137, 207, 240],
    },
    "baby_blue_eyes": {
      "name": "Baby Blue Eyes",
      "rgb": [161, 202, 241],
    },
    "baby_pink": {
      "name": "Baby Pink",
      "rgb": [244, 194, 194],
    },
    "ball_blue": {
      "name": "Ball Blue",
      "rgb": [33, 171, 205],
    },
    "banana_mania": {
      "name": "Banana Mania",
      "rgb": [250, 231, 181],
    },
    "banana_yellow": {
      "name": "Banana Yellow",
      "rgb": [255, 225, 53],
    },
    "barn_red": {
      "name": "Barn Red",
      "rgb": [124, 10, 2],
    },
    "battleship_grey": {
      "name": "Battleship Grey",
      "rgb": [132, 132, 130],
    },
    "bazaar": {
      "name": "Bazaar",
      "rgb": [152, 119, 123],
    },
    "beau_blue": {
      "name": "Beau Blue",
      "rgb": [188, 212, 230],
    },
    "beaver": {
      "name": "Beaver",
      "rgb": [159, 129, 112],
    },
    "beige": {
      "name": "Beige",
      "rgb": [245, 245, 220],
    },
    "big_dip_o_ruby": {
      "name": "Big Dip O’Ruby",
      "rgb": [156, 37, 66],
    },
    "bisque": {
      "name": "Bisque",
      "rgb": [255, 228, 196],
    },
    "bistre": {
      "name": "Bistre",
      "rgb": [61, 43, 31],
    },
    "bittersweet": {
      "name": "Bittersweet",
      "rgb": [254, 111, 94],
    },
    "bittersweet_shimmer": {
      "name": "Bittersweet Shimmer",
      "rgb": [191, 79, 81],
    },
    "black": {
      "name": "Black",
      "rgb": [0, 0, 0],
    },
    "black_bean": {
      "name": "Black Bean",
      "rgb": [61, 12, 2],
    },
    "black_leather_jacket": {
      "name": "Black Leather Jacket",
      "rgb": [37, 53, 41],
    },
    "black_olive": {
      "name": "Black Olive",
      "rgb": [59, 60, 54],
    },
    "blanched_almond": {
      "name": "Blanched Almond",
      "rgb": [255, 235, 205],
    },
    "blast_off_bronze": {
      "name": "Blast-Off Bronze",
      "rgb": [165, 113, 100],
    },
    "bleu_de_france": {
      "name": "Bleu De France",
      "rgb": [49, 140, 231],
    },
    "blizzard_blue": {
      "name": "Blizzard Blue",
      "rgb": [172, 229, 238],
    },
    "blond": {
      "name": "Blond",
      "rgb": [250, 240, 190],
    },
    "blue": {
      "name": "Blue",
      "rgb": [0, 0, 255],
    },
    "blue_bell": {
      "name": "Blue Bell",
      "rgb": [162, 162, 208],
    },
    "blue_crayola": {
      "name": "Blue (Crayola)",
      "rgb": [31, 117, 254],
    },
    "blue_gray": {
      "name": "Blue Gray",
      "rgb": [102, 153, 204],
    },
    "blue_green": {
      "name": "Blue-Green",
      "rgb": [13, 152, 186],
    },
    "blue_munsell": {
      "name": "Blue (Munsell)",
      "rgb": [0, 147, 175],
    },
    "blue_ncs": {
      "name": "Blue (Ncs)",
      "rgb": [0, 135, 189],
    },
    "blue_pigment": {
      "name": "Blue (Pigment)",
      "rgb": [51, 51, 153],
    },
    "blue_ryb": {
      "name": "Blue (Ryb)",
      "rgb": [2, 71, 254],
    },
    "blue_sapphire": {
      "name": "Blue Sapphire",
      "rgb": [18, 97, 128],
    },
    "blue_violet": {
      "name": "Blue-Violet",
      "rgb": [138, 43, 226],
    },
    "blush": {
      "name": "Blush",
      "rgb": [222, 93, 131],
    },
    "bole": {
      "name": "Bole",
      "rgb": [121, 68, 59],
    },
    "bondi_blue": {
      "name": "Bondi Blue",
      "rgb": [0, 149, 182],
    },
    "bone": {
      "name": "Bone",
      "rgb": [227, 218, 201],
    },
    "boston_university_red": {
      "name": "Boston University Red",
      "rgb": [204, 0, 0],
    },
    "bottle_green": {
      "name": "Bottle Green",
      "rgb": [0, 106, 78],
    },
    "boysenberry": {
      "name": "Boysenberry",
      "rgb": [135, 50, 96],
    },
    "brandeis_blue": {
      "name": "Brandeis Blue",
      "rgb": [0, 112, 255],
    },
    "brass": {
      "name": "Brass",
      "rgb": [181, 166, 66],
    },
    "brick_red": {
      "name": "Brick Red",
      "rgb": [203, 65, 84],
    },
    "bright_cerulean": {
      "name": "Bright Cerulean",
      "rgb": [29, 172, 214],
    },
    "bright_green": {
      "name": "Bright Green",
      "rgb": [102, 255, 0],
    },
    "bright_lavender": {
      "name": "Bright Lavender",
      "rgb": [191, 148, 228],
    },
    "bright_maroon": {
      "name": "Bright Maroon",
      "rgb": [195, 33, 72],
    },
    "bright_pink": {
      "name": "Bright Pink",
      "rgb": [255, 0, 127],
    },
    "bright_turquoise": {
      "name": "Bright Turquoise",
      "rgb": [8, 232, 222],
    },
    "bright_ube": {
      "name": "Bright Ube",
      "rgb": [209, 159, 232],
    },
    "brilliant_lavender": {
      "name": "Brilliant Lavender",
      "rgb": [244, 187, 255],
    },
    "brilliant_rose": {
      "name": "Brilliant Rose",
      "rgb": [255, 85, 163],
    },
    "brink_pink": {
      "name": "Brink Pink",
      "rgb": [251, 96, 127],
    },
    "british_racing_green": {
      "name": "British Racing Green",
      "rgb": [0, 66, 37],
    },
    "bronze": {
      "name": "Bronze",
      "rgb": [205, 127, 50],
    },
    "brown_traditional": {
      "name": "Brown (Traditional)",
      "rgb": [150, 75, 0],
    },
    "brown_web": {
      "name": "Brown (Web)",
      "rgb": [165, 42, 42],
    },
    "bubble_gum": {
      "name": "Bubble Gum",
      "rgb": [255, 193, 204],
    },
    "bubbles": {
      "name": "Bubbles",
      "rgb": [231, 254, 255],
    },
    "buff": {
      "name": "Buff",
      "rgb": [240, 220, 130],
    },
    "bulgarian_rose": {
      "name": "Bulgarian Rose",
      "rgb": [72, 6, 7],
    },
    "burgundy": {
      "name": "Burgundy",
      "rgb": [128, 0, 32],
    },
    "burlywood": {
      "name": "Burlywood",
      "rgb": [222, 184, 135],
    },
    "burnt_orange": {
      "name": "Burnt Orange",
      "rgb": [204, 85, 0],
    },
    "burnt_sienna": {
      "name": "Burnt Sienna",
      "rgb": [233, 116, 81],
    },
    "burnt_umber": {
      "name": "Burnt Umber",
      "rgb": [138, 51, 36],
    },
    "byzantine": {
      "name": "Byzantine",
      "rgb": [189, 51, 164],
    },
    "byzantium": {
      "name": "Byzantium",
      "rgb": [112, 41, 99],
    },
    "cadet": {
      "name": "Cadet",
      "rgb": [83, 104, 114],
    },
    "cadet_blue": {
      "name": "Cadet Blue",
      "rgb": [95, 158, 160],
    },
    "cadet_grey": {
      "name": "Cadet Grey",
      "rgb": [145, 163, 176],
    },
    "cadmium_green": {
      "name": "Cadmium Green",
      "rgb": [0, 107, 60],
    },
    "cadmium_orange": {
      "name": "Cadmium Orange",
      "rgb": [237, 135, 45],
    },
    "cadmium_red": {
      "name": "Cadmium Red",
      "rgb": [227, 0, 34],
    },
    "cadmium_yellow": {
      "name": "Cadmium Yellow",
      "rgb": [255, 246, 0],
    },
    "caf_au_lait": {
      "name": "Café Au Lait",
      "rgb": [166, 123, 91],
    },
    "caf_noir": {
      "name": "Café Noir",
      "rgb": [75, 54, 33],
    },
    "cal_poly_green": {
      "name": "Cal Poly Green",
      "rgb": [30, 77, 43],
    },
    "cambridge_blue": {
      "name": "Cambridge Blue",
      "rgb": [163, 193, 173],
    },
    "camel": {
      "name": "Camel",
      "rgb": [193, 154, 107],
    },
    "cameo_pink": {
      "name": "Cameo Pink",
      "rgb": [239, 187, 204],
    },
    "camouflage_green": {
      "name": "Camouflage Green",
      "rgb": [120, 134, 107],
    },
    "canary_yellow": {
      "name": "Canary Yellow",
      "rgb": [255, 239, 0],
    },
    "candy_apple_red": {
      "name": "Candy Apple Red",
      "rgb": [255, 8, 0],
    },
    "candy_pink": {
      "name": "Candy Pink",
      "rgb": [228, 113, 122],
    },
    "capri": {
      "name": "Capri",
      "rgb": [0, 191, 255],
    },
    "caput_mortuum": {
      "name": "Caput Mortuum",
      "rgb": [89, 39, 32],
    },
    "cardinal": {
      "name": "Cardinal",
      "rgb": [196, 30, 58],
    },
    "caribbean_green": {
      "name": "Caribbean Green",
      "rgb": [0, 204, 153],
    },
    "carmine": {
      "name": "Carmine",
      "rgb": [150, 0, 24],
    },
    "carmine_m_p": {
      "name": "Carmine (M&P)",
      "rgb": [215, 0, 64],
    },
    "carmine_pink": {
      "name": "Carmine Pink",
      "rgb": [235, 76, 66],
    },
    "carmine_red": {
      "name": "Carmine Red",
      "rgb": [255, 0, 56],
    },
    "carnation_pink": {
      "name": "Carnation Pink",
      "rgb": [255, 166, 201],
    },
    "carnelian": {
      "name": "Carnelian",
      "rgb": [179, 27, 27],
    },
    "carolina_blue": {
      "name": "Carolina Blue",
      "rgb": [153, 186, 221],
    },
    "carrot_orange": {
      "name": "Carrot Orange",
      "rgb": [237, 145, 33],
    },
    "catalina_blue": {
      "name": "Catalina Blue",
      "rgb": [6, 42, 120],
    },
    "ceil": {
      "name": "Ceil",
      "rgb": [146, 161, 207],
    },
    "celadon": {
      "name": "Celadon",
      "rgb": [172, 225, 175],
    },
    "celadon_blue": {
      "name": "Celadon Blue",
      "rgb": [0, 123, 167],
    },
    "celadon_green": {
      "name": "Celadon Green",
      "rgb": [47, 132, 124],
    },
    "celeste_colour": {
      "name": "Celeste (Colour)",
      "rgb": [178, 255, 255],
    },
    "celestial_blue": {
      "name": "Celestial Blue",
      "rgb": [73, 151, 208],
    },
    "cerise": {
      "name": "Cerise",
      "rgb": [222, 49, 99],
    },
    "cerise_pink": {
      "name": "Cerise Pink",
      "rgb": [236, 59, 131],
    },
    "cerulean": {
      "name": "Cerulean",
      "rgb": [0, 123, 167],
    },
    "cerulean_blue": {
      "name": "Cerulean Blue",
      "rgb": [42, 82, 190],
    },
    "cerulean_frost": {
      "name": "Cerulean Frost",
      "rgb": [109, 155, 195],
    },
    "cg_blue": {
      "name": "Cg Blue",
      "rgb": [0, 122, 165],
    },
    "cg_red": {
      "name": "Cg Red",
      "rgb": [224, 60, 49],
    },
    "chamoisee": {
      "name": "Chamoisee",
      "rgb": [160, 120, 90],
    },
    "champagne": {
      "name": "Champagne",
      "rgb": [250, 214, 165],
    },
    "charcoal": {
      "name": "Charcoal",
      "rgb": [54, 69, 79],
    },
    "charm_pink": {
      "name": "Charm Pink",
      "rgb": [230, 143, 172],
    },
    "chartreuse_traditional": {
      "name": "Chartreuse (Traditional)",
      "rgb": [223, 255, 0],
    },
    "chartreuse_web": {
      "name": "Chartreuse (Web)",
      "rgb": [127, 255, 0],
    },
    "cherry": {
      "name": "Cherry",
      "rgb": [222, 49, 99],
    },
    "cherry_blossom_pink": {
      "name": "Cherry Blossom Pink",
      "rgb": [255, 183, 197],
    },
    "chestnut": {
      "name": "Chestnut",
      "rgb": [205, 92, 92],
    },
    "china_pink": {
      "name": "China Pink",
      "rgb": [222, 111, 161],
    },
    "china_rose": {
      "name": "China Rose",
      "rgb": [168, 81, 110],
    },
    "chinese_red": {
      "name": "Chinese Red",
      "rgb": [170, 56, 30],
    },
    "chocolate_traditional": {
      "name": "Chocolate (Traditional)",
      "rgb": [123, 63, 0],
    },
    "chocolate_web": {
      "name": "Chocolate (Web)",
      "rgb": [210, 105, 30],
    },
    "chrome_yellow": {
      "name": "Chrome Yellow",
      "rgb": [255, 167, 0],
    },
    "cinereous": {
      "name": "Cinereous",
      "rgb": [152, 129, 123],
    },
    "cinnabar": {
      "name": "Cinnabar",
      "rgb": [227, 66, 52],
    },
    "cinnamon": {
      "name": "Cinnamon",
      "rgb": [210, 105, 30],
    },
    "citrine": {
      "name": "Citrine",
      "rgb": [228, 208, 10],
    },
    "classic_rose": {
      "name": "Classic Rose",
      "rgb": [251, 204, 231],
    },
    "cobalt": {
      "name": "Cobalt",
      "rgb": [0, 71, 171],
    },
    "cocoa_brown": {
      "name": "Cocoa Brown",
      "rgb": [210, 105, 30],
    },
    "coffee": {
      "name": "Coffee",
      "rgb": [111, 78, 55],
    },
    "columbia_blue": {
      "name": "Columbia Blue",
      "rgb": [155, 221, 255],
    },
    "congo_pink": {
      "name": "Congo Pink",
      "rgb": [248, 131, 121],
    },
    "cool_black": {
      "name": "Cool Black",
      "rgb": [0, 46, 99],
    },
    "cool_grey": {
      "name": "Cool Grey",
      "rgb": [140, 146, 172],
    },
    "copper": {
      "name": "Copper",
      "rgb": [184, 115, 51],
    },
    "copper_crayola": {
      "name": "Copper (Crayola)",
      "rgb": [218, 138, 103],
    },
    "copper_penny": {
      "name": "Copper Penny",
      "rgb": [173, 111, 105],
    },
    "copper_red": {
      "name": "Copper Red",
      "rgb": [203, 109, 81],
    },
    "copper_rose": {
      "name": "Copper Rose",
      "rgb": [153, 102, 102],
    },
    "coquelicot": {
      "name": "Coquelicot",
      "rgb": [255, 56, 0],
    },
    "coral": {
      "name": "Coral",
      "rgb": [255, 127, 80],
    },
    "coral_pink": {
      "name": "Coral Pink",
      "rgb": [248, 131, 121],
    },
    "coral_red": {
      "name": "Coral Red",
      "rgb": [255, 64, 64],
    },
    "cordovan": {
      "name": "Cordovan",
      "rgb": [137, 63, 69],
    },
    "corn": {
      "name": "Corn",
      "rgb": [251, 236, 93],
    },
    "cornell_red": {
      "name": "Cornell Red",
      "rgb": [179, 27, 27],
    },
    "cornflower_blue": {
      "name": "Cornflower Blue",
      "rgb": [100, 149, 237],
    },
    "cornsilk": {
      "name": "Cornsilk",
      "rgb": [255, 248, 220],
    },
    "cosmic_latte": {
      "name": "Cosmic Latte",
      "rgb": [255, 248, 231],
    },
    "cotton_candy": {
      "name": "Cotton Candy",
      "rgb": [255, 188, 217],
    },
    "cream": {
      "name": "Cream",
      "rgb": [255, 253, 208],
    },
    "crimson": {
      "name": "Crimson",
      "rgb": [220, 20, 60],
    },
    "crimson_glory": {
      "name": "Crimson Glory",
      "rgb": [190, 0, 50],
    },
    "cyan": {
      "name": "Cyan",
      "rgb": [0, 255, 255],
    },
    "cyan_process": {
      "name": "Cyan (Process)",
      "rgb": [0, 183, 235],
    },
    "daffodil": {
      "name": "Daffodil",
      "rgb": [255, 255, 49],
    },
    "dandelion": {
      "name": "Dandelion",
      "rgb": [240, 225, 48],
    },
    "dark_blue": {
      "name": "Dark Blue",
      "rgb": [0, 0, 139],
    },
    "dark_brown": {
      "name": "Dark Brown",
      "rgb": [101, 67, 33],
    },
    "dark_byzantium": {
      "name": "Dark Byzantium",
      "rgb": [93, 57, 84],
    },
    "dark_candy_apple_red": {
      "name": "Dark Candy Apple Red",
      "rgb": [164, 0, 0],
    },
    "dark_cerulean": {
      "name": "Dark Cerulean",
      "rgb": [8, 69, 126],
    },
    "dark_chestnut": {
      "name": "Dark Chestnut",
      "rgb": [152, 105, 96],
    },
    "dark_coral": {
      "name": "Dark Coral",
      "rgb": [205, 91, 69],
    },
    "dark_cyan": {
      "name": "Dark Cyan",
      "rgb": [0, 139, 139],
    },
    "dark_electric_blue": {
      "name": "Dark Electric Blue",
      "rgb": [83, 104, 120],
    },
    "dark_goldenrod": {
      "name": "Dark Goldenrod",
      "rgb": [184, 134, 11],
    },
    "dark_gray": {
      "name": "Dark Gray",
      "rgb": [169, 169, 169],
    },
    "dark_green": {
      "name": "Dark Green",
      "rgb": [1, 50, 32],
    },
    "dark_imperial_blue": {
      "name": "Dark Imperial Blue",
      "rgb": [0, 65, 106],
    },
    "dark_jungle_green": {
      "name": "Dark Jungle Green",
      "rgb": [26, 36, 33],
    },
    "dark_khaki": {
      "name": "Dark Khaki",
      "rgb": [189, 183, 107],
    },
    "dark_lava": {
      "name": "Dark Lava",
      "rgb": [72, 60, 50],
    },
    "dark_lavender": {
      "name": "Dark Lavender",
      "rgb": [115, 79, 150],
    },
    "dark_magenta": {
      "name": "Dark Magenta",
      "rgb": [139, 0, 139],
    },
    "dark_midnight_blue": {
      "name": "Dark Midnight Blue",
      "rgb": [0, 51, 102],
    },
    "dark_olive_green": {
      "name": "Dark Olive Green",
      "rgb": [85, 107, 47],
    },
    "dark_orange": {
      "name": "Dark Orange",
      "rgb": [255, 140, 0],
    },
    "dark_orchid": {
      "name": "Dark Orchid",
      "rgb": [153, 50, 204],
    },
    "dark_pastel_blue": {
      "name": "Dark Pastel Blue",
      "rgb": [119, 158, 203],
    },
    "dark_pastel_green": {
      "name": "Dark Pastel Green",
      "rgb": [3, 192, 60],
    },
    "dark_pastel_purple": {
      "name": "Dark Pastel Purple",
      "rgb": [150, 111, 214],
    },
    "dark_pastel_red": {
      "name": "Dark Pastel Red",
      "rgb": [194, 59, 34],
    },
    "dark_pink": {
      "name": "Dark Pink",
      "rgb": [231, 84, 128],
    },
    "dark_powder_blue": {
      "name": "Dark Powder Blue",
      "rgb": [0, 51, 153],
    },
    "dark_raspberry": {
      "name": "Dark Raspberry",
      "rgb": [135, 38, 87],
    },
    "dark_red": {
      "name": "Dark Red",
      "rgb": [139, 0, 0],
    },
    "dark_salmon": {
      "name": "Dark Salmon",
      "rgb": [233, 150, 122],
    },
    "dark_scarlet": {
      "name": "Dark Scarlet",
      "rgb": [86, 3, 25],
    },
    "dark_sea_green": {
      "name": "Dark Sea Green",
      "rgb": [143, 188, 143],
    },
    "dark_sienna": {
      "name": "Dark Sienna",
      "rgb": [60, 20, 20],
    },
    "dark_slate_blue": {
      "name": "Dark Slate Blue",
      "rgb": [72, 61, 139],
    },
    "dark_slate_gray": {
      "name": "Dark Slate Gray",
      "rgb": [47, 79, 79],
    },
    "dark_spring_green": {
      "name": "Dark Spring Green",
      "rgb": [23, 114, 69],
    },
    "dark_tan": {
      "name": "Dark Tan",
      "rgb": [145, 129, 81],
    },
    "dark_tangerine": {
      "name": "Dark Tangerine",
      "rgb": [255, 168, 18],
    },
    "dark_taupe": {
      "name": "Dark Taupe",
      "rgb": [72, 60, 50],
    },
    "dark_terra_cotta": {
      "name": "Dark Terra Cotta",
      "rgb": [204, 78, 92],
    },
    "dark_turquoise": {
      "name": "Dark Turquoise",
      "rgb": [0, 206, 209],
    },
    "dark_violet": {
      "name": "Dark Violet",
      "rgb": [148, 0, 211],
    },
    "dark_yellow": {
      "name": "Dark Yellow",
      "rgb": [155, 135, 12],
    },
    "dartmouth_green": {
      "name": "Dartmouth Green",
      "rgb": [0, 112, 60],
    },
    "davy_s_grey": {
      "name": "Davy'S Grey",
      "rgb": [85, 85, 85],
    },
    "debian_red": {
      "name": "Debian Red",
      "rgb": [215, 10, 83],
    },
    "deep_carmine": {
      "name": "Deep Carmine",
      "rgb": [169, 32, 62],
    },
    "deep_carmine_pink": {
      "name": "Deep Carmine Pink",
      "rgb": [239, 48, 56],
    },
    "deep_carrot_orange": {
      "name": "Deep Carrot Orange",
      "rgb": [233, 105, 44],
    },
    "deep_cerise": {
      "name": "Deep Cerise",
      "rgb": [218, 50, 135],
    },
    "deep_champagne": {
      "name": "Deep Champagne",
      "rgb": [250, 214, 165],
    },
    "deep_chestnut": {
      "name": "Deep Chestnut",
      "rgb": [185, 78, 72],
    },
    "deep_coffee": {
      "name": "Deep Coffee",
      "rgb": [112, 66, 65],
    },
    "deep_fuchsia": {
      "name": "Deep Fuchsia",
      "rgb": [193, 84, 193],
    },
    "deep_jungle_green": {
      "name": "Deep Jungle Green",
      "rgb": [0, 75, 73],
    },
    "deep_lilac": {
      "name": "Deep Lilac",
      "rgb": [153, 85, 187],
    },
    "deep_magenta": {
      "name": "Deep Magenta",
      "rgb": [204, 0, 204],
    },
    "deep_peach": {
      "name": "Deep Peach",
      "rgb": [255, 203, 164],
    },
    "deep_pink": {
      "name": "Deep Pink",
      "rgb": [255, 20, 147],
    },
    "deep_ruby": {
      "name": "Deep Ruby",
      "rgb": [132, 63, 91],
    },
    "deep_saffron": {
      "name": "Deep Saffron",
      "rgb": [255, 153, 51],
    },
    "deep_sky_blue": {
      "name": "Deep Sky Blue",
      "rgb": [0, 191, 255],
    },
    "deep_tuscan_red": {
      "name": "Deep Tuscan Red",
      "rgb": [102, 66, 77],
    },
    "denim": {
      "name": "Denim",
      "rgb": [21, 96, 189],
    },
    "desert": {
      "name": "Desert",
      "rgb": [193, 154, 107],
    },
    "desert_sand": {
      "name": "Desert Sand",
      "rgb": [237, 201, 175],
    },
    "dim_gray": {
      "name": "Dim Gray",
      "rgb": [105, 105, 105],
    },
    "dodger_blue": {
      "name": "Dodger Blue",
      "rgb": [30, 144, 255],
    },
    "dogwood_rose": {
      "name": "Dogwood Rose",
      "rgb": [215, 24, 104],
    },
    "dollar_bill": {
      "name": "Dollar Bill",
      "rgb": [133, 187, 101],
    },
    "drab": {
      "name": "Drab",
      "rgb": [150, 113, 23],
    },
    "duke_blue": {
      "name": "Duke Blue",
      "rgb": [0, 0, 156],
    },
    "earth_yellow": {
      "name": "Earth Yellow",
      "rgb": [225, 169, 95],
    },
    "ebony": {
      "name": "Ebony",
      "rgb": [85, 93, 80],
    },
    "ecru": {
      "name": "Ecru",
      "rgb": [194, 178, 128],
    },
    "eggplant": {
      "name": "Eggplant",
      "rgb": [97, 64, 81],
    },
    "eggshell": {
      "name": "Eggshell",
      "rgb": [240, 234, 214],
    },
    "egyptian_blue": {
      "name": "Egyptian Blue",
      "rgb": [16, 52, 166],
    },
    "electric_blue": {
      "name": "Electric Blue",
      "rgb": [125, 249, 255],
    },
    "electric_crimson": {
      "name": "Electric Crimson",
      "rgb": [255, 0, 63],
    },
    "electric_cyan": {
      "name": "Electric Cyan",
      "rgb": [0, 255, 255],
    },
    "electric_green": {
      "name": "Electric Green",
      "rgb": [0, 255, 0],
    },
    "electric_indigo": {
      "name": "Electric Indigo",
      "rgb": [111, 0, 255],
    },
    "electric_lavender": {
      "name": "Electric Lavender",
      "rgb": [244, 187, 255],
    },
    "electric_lime": {
      "name": "Electric Lime",
      "rgb": [204, 255, 0],
    },
    "electric_purple": {
      "name": "Electric Purple",
      "rgb": [191, 0, 255],
    },
    "electric_ultramarine": {
      "name": "Electric Ultramarine",
      "rgb": [63, 0, 255],
    },
    "electric_violet": {
      "name": "Electric Violet",
      "rgb": [143, 0, 255],
    },
    "electric_yellow": {
      "name": "Electric Yellow",
      "rgb": [255, 255, 0],
    },
    "emerald": {
      "name": "Emerald",
      "rgb": [80, 200, 120],
    },
    "english_lavender": {
      "name": "English Lavender",
      "rgb": [180, 131, 149],
    },
    "eton_blue": {
      "name": "Eton Blue",
      "rgb": [150, 200, 162],
    },
    "fallow": {
      "name": "Fallow",
      "rgb": [193, 154, 107],
    },
    "falu_red": {
      "name": "Falu Red",
      "rgb": [128, 24, 24],
    },
    "fandango": {
      "name": "Fandango",
      "rgb": [181, 51, 137],
    },
    "fashion_fuchsia": {
      "name": "Fashion Fuchsia",
      "rgb": [244, 0, 161],
    },
    "fawn": {
      "name": "Fawn",
      "rgb": [229, 170, 112],
    },
    "feldgrau": {
      "name": "Feldgrau",
      "rgb": [77, 93, 83],
    },
    "fern_green": {
      "name": "Fern Green",
      "rgb": [79, 121, 66],
    },
    "ferrari_red": {
      "name": "Ferrari Red",
      "rgb": [255, 40, 0],
    },
    "field_drab": {
      "name": "Field Drab",
      "rgb": [108, 84, 30],
    },
    "fire_engine_red": {
      "name": "Fire Engine Red",
      "rgb": [206, 32, 41],
    },
    "firebrick": {
      "name": "Firebrick",
      "rgb": [178, 34, 34],
    },
    "flame": {
      "name": "Flame",
      "rgb": [226, 88, 34],
    },
    "flamingo_pink": {
      "name": "Flamingo Pink",
      "rgb": [252, 142, 172],
    },
    "flavescent": {
      "name": "Flavescent",
      "rgb": [247, 233, 142],
    },
    "flax": {
      "name": "Flax",
      "rgb": [238, 220, 130],
    },
    "floral_white": {
      "name": "Floral White",
      "rgb": [255, 250, 240],
    },
    "fluorescent_orange": {
      "name": "Fluorescent Orange",
      "rgb": [255, 191, 0],
    },
    "fluorescent_pink": {
      "name": "Fluorescent Pink",
      "rgb": [255, 20, 147],
    },
    "fluorescent_yellow": {
      "name": "Fluorescent Yellow",
      "rgb": [204, 255, 0],
    },
    "folly": {
      "name": "Folly",
      "rgb": [255, 0, 79],
    },
    "forest_green_traditional": {
      "name": "Forest Green (Traditional)",
      "rgb": [1, 68, 33],
    },
    "forest_green_web": {
      "name": "Forest Green (Web)",
      "rgb": [34, 139, 34],
    },
    "french_beige": {
      "name": "French Beige",
      "rgb": [166, 123, 91],
    },
    "french_blue": {
      "name": "French Blue",
      "rgb": [0, 114, 187],
    },
    "french_lilac": {
      "name": "French Lilac",
      "rgb": [134, 96, 142],
    },
    "french_lime": {
      "name": "French Lime",
      "rgb": [204, 255, 0],
    },
    "french_raspberry": {
      "name": "French Raspberry",
      "rgb": [199, 44, 72],
    },
    "french_rose": {
      "name": "French Rose",
      "rgb": [246, 74, 138],
    },
    "fuchsia": {
      "name": "Fuchsia",
      "rgb": [255, 0, 255],
    },
    "fuchsia_crayola": {
      "name": "Fuchsia (Crayola)",
      "rgb": [193, 84, 193],
    },
    "fuchsia_pink": {
      "name": "Fuchsia Pink",
      "rgb": [255, 119, 255],
    },
    "fuchsia_rose": {
      "name": "Fuchsia Rose",
      "rgb": [199, 67, 117],
    },
    "fulvous": {
      "name": "Fulvous",
      "rgb": [228, 132, 0],
    },
    "fuzzy_wuzzy": {
      "name": "Fuzzy Wuzzy",
      "rgb": [204, 102, 102],
    },
    "gainsboro": {
      "name": "Gainsboro",
      "rgb": [220, 220, 220],
    },
    "gamboge": {
      "name": "Gamboge",
      "rgb": [228, 155, 15],
    },
    "ghost_white": {
      "name": "Ghost White",
      "rgb": [248, 248, 255],
    },
    "ginger": {
      "name": "Ginger",
      "rgb": [176, 101, 0],
    },
    "glaucous": {
      "name": "Glaucous",
      "rgb": [96, 130, 182],
    },
    "glitter": {
      "name": "Glitter",
      "rgb": [230, 232, 250],
    },
    "gold_metallic": {
      "name": "Gold (Metallic)",
      "rgb": [212, 175, 55],
    },
    "gold_web_golden": {
      "name": "Gold (Web) (Golden)",
      "rgb": [255, 215, 0],
    },
    "golden_brown": {
      "name": "Golden Brown",
      "rgb": [153, 101, 21],
    },
    "golden_poppy": {
      "name": "Golden Poppy",
      "rgb": [252, 194, 0],
    },
    "golden_yellow": {
      "name": "Golden Yellow",
      "rgb": [255, 223, 0],
    },
    "goldenrod": {
      "name": "Goldenrod",
      "rgb": [218, 165, 32],
    },
    "granny_smith_apple": {
      "name": "Granny Smith Apple",
      "rgb": [168, 228, 160],
    },
    "gray": {
      "name": "Gray",
      "rgb": [128, 128, 128],
    },
    "gray_asparagus": {
      "name": "Gray-Asparagus",
      "rgb": [70, 89, 69],
    },
    "gray_html_css_gray": {
      "name": "Gray (Html/Css Gray)",
      "rgb": [128, 128, 128],
    },
    "gray_x11_gray": {
      "name": "Gray (X11 Gray)",
      "rgb": [190, 190, 190],
    },
    "green_color_wheel_x11_green": {
      "name": "Green (Color Wheel) (X11 Green)",
      "rgb": [0, 255, 0],
    },
    "green_crayola": {
      "name": "Green (Crayola)",
      "rgb": [28, 172, 120],
    },
    "green_html_css_green": {
      "name": "Green (Html/Css Green)",
      "rgb": [0, 128, 0],
    },
    "green_munsell": {
      "name": "Green (Munsell)",
      "rgb": [0, 168, 119],
    },
    "green_ncs": {
      "name": "Green (Ncs)",
      "rgb": [0, 159, 107],
    },
    "green_pigment": {
      "name": "Green (Pigment)",
      "rgb": [0, 165, 80],
    },
    "green_ryb": {
      "name": "Green (Ryb)",
      "rgb": [102, 176, 50],
    },
    "green_yellow": {
      "name": "Green-Yellow",
      "rgb": [173, 255, 47],
    },
    "grullo": {
      "name": "Grullo",
      "rgb": [169, 154, 134],
    },
    "guppie_green": {
      "name": "Guppie Green",
      "rgb": [0, 255, 127],
    },
    "halay_be": {
      "name": "Halayà úBe",
      "rgb": [102, 56, 84],
    },
    "han_blue": {
      "name": "Han Blue",
      "rgb": [68, 108, 207],
    },
    "han_purple": {
      "name": "Han Purple",
      "rgb": [82, 24, 250],
    },
    "hansa_yellow": {
      "name": "Hansa Yellow",
      "rgb": [233, 214, 107],
    },
    "harlequin": {
      "name": "Harlequin",
      "rgb": [63, 255, 0],
    },
    "harvard_crimson": {
      "name": "Harvard Crimson",
      "rgb": [201, 0, 22],
    },
    "harvest_gold": {
      "name": "Harvest Gold",
      "rgb": [218, 145, 0],
    },
    "heart_gold": {
      "name": "Heart Gold",
      "rgb": [128, 128, 0],
    },
    "heliotrope": {
      "name": "Heliotrope",
      "rgb": [223, 115, 255],
    },
    "hollywood_cerise": {
      "name": "Hollywood Cerise",
      "rgb": [244, 0, 161],
    },
    "honeydew": {
      "name": "Honeydew",
      "rgb": [240, 255, 240],
    },
    "honolulu_blue": {
      "name": "Honolulu Blue",
      "rgb": [0, 127, 191],
    },
    "hooker_s_green": {
      "name": "Hooker'S Green",
      "rgb": [73, 121, 107],
    },
    "hot_magenta": {
      "name": "Hot Magenta",
      "rgb": [255, 29, 206],
    },
    "hot_pink": {
      "name": "Hot Pink",
      "rgb": [255, 105, 180],
    },
    "hunter_green": {
      "name": "Hunter Green",
      "rgb": [53, 94, 59],
    },
    "iceberg": {
      "name": "Iceberg",
      "rgb": [113, 166, 210],
    },
    "icterine": {
      "name": "Icterine",
      "rgb": [252, 247, 94],
    },
    "imperial_blue": {
      "name": "Imperial Blue",
      "rgb": [0, 35, 149],
    },
    "inchworm": {
      "name": "Inchworm",
      "rgb": [178, 236, 93],
    },
    "india_green": {
      "name": "India Green",
      "rgb": [19, 136, 8],
    },
    "indian_red": {
      "name": "Indian Red",
      "rgb": [205, 92, 92],
    },
    "indian_yellow": {
      "name": "Indian Yellow",
      "rgb": [227, 168, 87],
    },
    "indigo": {
      "name": "Indigo",
      "rgb": [111, 0, 255],
    },
    "indigo_dye": {
      "name": "Indigo (Dye)",
      "rgb": [0, 65, 106],
    },
    "indigo_web": {
      "name": "Indigo (Web)",
      "rgb": [75, 0, 130],
    },
    "international_klein_blue": {
      "name": "International Klein Blue",
      "rgb": [0, 47, 167],
    },
    "international_orange_aerospace": {
      "name": "International Orange (Aerospace)",
      "rgb": [255, 79, 0],
    },
    "international_orange_engineering": {
      "name": "International Orange (Engineering)",
      "rgb": [186, 22, 12],
    },
    "international_orange_golden_gate_bridge": {
      "name": "International Orange (Golden Gate Bridge)",
      "rgb": [192, 54, 44],
    },
    "iris": {
      "name": "Iris",
      "rgb": [90, 79, 207],
    },
    "isabelline": {
      "name": "Isabelline",
      "rgb": [244, 240, 236],
    },
    "islamic_green": {
      "name": "Islamic Green",
      "rgb": [0, 144, 0],
    },
    "ivory": {
      "name": "Ivory",
      "rgb": [255, 255, 240],
    },
    "jade": {
      "name": "Jade",
      "rgb": [0, 168, 107],
    },
    "jasmine": {
      "name": "Jasmine",
      "rgb": [248, 222, 126],
    },
    "jasper": {
      "name": "Jasper",
      "rgb": [215, 59, 62],
    },
    "jazzberry_jam": {
      "name": "Jazzberry Jam",
      "rgb": [165, 11, 94],
    },
    "jet": {
      "name": "Jet",
      "rgb": [52, 52, 52],
    },
    "jonquil": {
      "name": "Jonquil",
      "rgb": [250, 218, 94],
    },
    "june_bud": {
      "name": "June Bud",
      "rgb": [189, 218, 87],
    },
    "jungle_green": {
      "name": "Jungle Green",
      "rgb": [41, 171, 135],
    },
    "kelly_green": {
      "name": "Kelly Green",
      "rgb": [76, 187, 23],
    },
    "kenyan_copper": {
      "name": "Kenyan Copper",
      "rgb": [124, 28, 5],
    },
    "khaki_html_css_khaki": {
      "name": "Khaki (Html/Css) (Khaki)",
      "rgb": [195, 176, 145],
    },
    "khaki_x11_light_khaki": {
      "name": "Khaki (X11) (Light Khaki)",
      "rgb": [240, 230, 140],
    },
    "ku_crimson": {
      "name": "Ku Crimson",
      "rgb": [232, 0, 13],
    },
    "la_salle_green": {
      "name": "La Salle Green",
      "rgb": [8, 120, 48],
    },
    "languid_lavender": {
      "name": "Languid Lavender",
      "rgb": [214, 202, 221],
    },
    "lapis_lazuli": {
      "name": "Lapis Lazuli",
      "rgb": [38, 97, 156],
    },
    "laser_lemon": {
      "name": "Laser Lemon",
      "rgb": [254, 254, 34],
    },
    "laurel_green": {
      "name": "Laurel Green",
      "rgb": [169, 186, 157],
    },
    "lava": {
      "name": "Lava",
      "rgb": [207, 16, 32],
    },
    "lavender_blue": {
      "name": "Lavender Blue",
      "rgb": [204, 204, 255],
    },
    "lavender_blush": {
      "name": "Lavender Blush",
      "rgb": [255, 240, 245],
    },
    "lavender_floral": {
      "name": "Lavender (Floral)",
      "rgb": [181, 126, 220],
    },
    "lavender_gray": {
      "name": "Lavender Gray",
      "rgb": [196, 195, 208],
    },
    "lavender_indigo": {
      "name": "Lavender Indigo",
      "rgb": [148, 87, 235],
    },
    "lavender_magenta": {
      "name": "Lavender Magenta",
      "rgb": [238, 130, 238],
    },
    "lavender_mist": {
      "name": "Lavender Mist",
      "rgb": [230, 230, 250],
    },
    "lavender_pink": {
      "name": "Lavender Pink",
      "rgb": [251, 174, 210],
    },
    "lavender_purple": {
      "name": "Lavender Purple",
      "rgb": [150, 123, 182],
    },
    "lavender_rose": {
      "name": "Lavender Rose",
      "rgb": [251, 160, 227],
    },
    "lavender_web": {
      "name": "Lavender (Web)",
      "rgb": [230, 230, 250],
    },
    "lawn_green": {
      "name": "Lawn Green",
      "rgb": [124, 252, 0],
    },
    "lemon": {
      "name": "Lemon",
      "rgb": [255, 247, 0],
    },
    "lemon_chiffon": {
      "name": "Lemon Chiffon",
      "rgb": [255, 250, 205],
    },
    "lemon_lime": {
      "name": "Lemon Lime",
      "rgb": [227, 255, 0],
    },
    "licorice": {
      "name": "Licorice",
      "rgb": [26, 17, 16],
    },
    "light_apricot": {
      "name": "Light Apricot",
      "rgb": [253, 213, 177],
    },
    "light_blue": {
      "name": "Light Blue",
      "rgb": [173, 216, 230],
    },
    "light_brown": {
      "name": "Light Brown",
      "rgb": [181, 101, 29],
    },
    "light_carmine_pink": {
      "name": "Light Carmine Pink",
      "rgb": [230, 103, 113],
    },
    "light_coral": {
      "name": "Light Coral",
      "rgb": [240, 128, 128],
    },
    "light_cornflower_blue": {
      "name": "Light Cornflower Blue",
      "rgb": [147, 204, 234],
    },
    "light_crimson": {
      "name": "Light Crimson",
      "rgb": [245, 105, 145],
    },
    "light_cyan": {
      "name": "Light Cyan",
      "rgb": [224, 255, 255],
    },
    "light_fuchsia_pink": {
      "name": "Light Fuchsia Pink",
      "rgb": [249, 132, 239],
    },
    "light_goldenrod_yellow": {
      "name": "Light Goldenrod Yellow",
      "rgb": [250, 250, 210],
    },
    "light_gray": {
      "name": "Light Gray",
      "rgb": [211, 211, 211],
    },
    "light_green": {
      "name": "Light Green",
      "rgb": [144, 238, 144],
    },
    "light_khaki": {
      "name": "Light Khaki",
      "rgb": [240, 230, 140],
    },
    "light_pastel_purple": {
      "name": "Light Pastel Purple",
      "rgb": [177, 156, 217],
    },
    "light_pink": {
      "name": "Light Pink",
      "rgb": [255, 182, 193],
    },
    "light_red_ochre": {
      "name": "Light Red Ochre",
      "rgb": [233, 116, 81],
    },
    "light_salmon": {
      "name": "Light Salmon",
      "rgb": [255, 160, 122],
    },
    "light_salmon_pink": {
      "name": "Light Salmon Pink",
      "rgb": [255, 153, 153],
    },
    "light_sea_green": {
      "name": "Light Sea Green",
      "rgb": [32, 178, 170],
    },
    "light_sky_blue": {
      "name": "Light Sky Blue",
      "rgb": [135, 206, 250],
    },
    "light_slate_gray": {
      "name": "Light Slate Gray",
      "rgb": [119, 136, 153],
    },
    "light_taupe": {
      "name": "Light Taupe",
      "rgb": [179, 139, 109],
    },
    "light_thulian_pink": {
      "name": "Light Thulian Pink",
      "rgb": [230, 143, 172],
    },
    "light_yellow": {
      "name": "Light Yellow",
      "rgb": [255, 255, 224],
    },
    "lilac": {
      "name": "Lilac",
      "rgb": [200, 162, 200],
    },
    "lime_color_wheel": {
      "name": "Lime (Color Wheel)",
      "rgb": [191, 255, 0],
    },
    "lime_green": {
      "name": "Lime Green",
      "rgb": [50, 205, 50],
    },
    "lime_web_x11_green": {
      "name": "Lime (Web) (X11 Green)",
      "rgb": [0, 255, 0],
    },
    "limerick": {
      "name": "Limerick",
      "rgb": [157, 194, 9],
    },
    "lincoln_green": {
      "name": "Lincoln Green",
      "rgb": [25, 89, 5],
    },
    "linen": {
      "name": "Linen",
      "rgb": [250, 240, 230],
    },
    "lion": {
      "name": "Lion",
      "rgb": [193, 154, 107],
    },
    "little_boy_blue": {
      "name": "Little Boy Blue",
      "rgb": [108, 160, 220],
    },
    "liver": {
      "name": "Liver",
      "rgb": [83, 75, 79],
    },
    "lust": {
      "name": "Lust",
      "rgb": [230, 32, 32],
    },
    "magenta": {
      "name": "Magenta",
      "rgb": [255, 0, 255],
    },
    "magenta_dye": {
      "name": "Magenta (Dye)",
      "rgb": [202, 31, 123],
    },
    "magenta_process": {
      "name": "Magenta (Process)",
      "rgb": [255, 0, 144],
    },
    "magic_mint": {
      "name": "Magic Mint",
      "rgb": [170, 240, 209],
    },
    "magnolia": {
      "name": "Magnolia",
      "rgb": [248, 244, 255],
    },
    "mahogany": {
      "name": "Mahogany",
      "rgb": [192, 64, 0],
    },
    "maize": {
      "name": "Maize",
      "rgb": [251, 236, 93],
    },
    "majorelle_blue": {
      "name": "Majorelle Blue",
      "rgb": [96, 80, 220],
    },
    "malachite": {
      "name": "Malachite",
      "rgb": [11, 218, 81],
    },
    "manatee": {
      "name": "Manatee",
      "rgb": [151, 154, 170],
    },
    "mango_tango": {
      "name": "Mango Tango",
      "rgb": [255, 130, 67],
    },
    "mantis": {
      "name": "Mantis",
      "rgb": [116, 195, 101],
    },
    "mardi_gras": {
      "name": "Mardi Gras",
      "rgb": [136, 0, 133],
    },
    "maroon_crayola": {
      "name": "Maroon (Crayola)",
      "rgb": [195, 33, 72],
    },
    "maroon_html_css": {
      "name": "Maroon (Html/Css)",
      "rgb": [128, 0, 0],
    },
    "maroon_x11": {
      "name": "Maroon (X11)",
      "rgb": [176, 48, 96],
    },
    "mauve": {
      "name": "Mauve",
      "rgb": [224, 176, 255],
    },
    "mauve_taupe": {
      "name": "Mauve Taupe",
      "rgb": [145, 95, 109],
    },
    "mauvelous": {
      "name": "Mauvelous",
      "rgb": [239, 152, 170],
    },
    "maya_blue": {
      "name": "Maya Blue",
      "rgb": [115, 194, 251],
    },
    "meat_brown": {
      "name": "Meat Brown",
      "rgb": [229, 183, 59],
    },
    "medium_aquamarine": {
      "name": "Medium Aquamarine",
      "rgb": [102, 221, 170],
    },
    "medium_blue": {
      "name": "Medium Blue",
      "rgb": [0, 0, 205],
    },
    "medium_candy_apple_red": {
      "name": "Medium Candy Apple Red",
      "rgb": [226, 6, 44],
    },
    "medium_carmine": {
      "name": "Medium Carmine",
      "rgb": [175, 64, 53],
    },
    "medium_champagne": {
      "name": "Medium Champagne",
      "rgb": [243, 229, 171],
    },
    "medium_electric_blue": {
      "name": "Medium Electric Blue",
      "rgb": [3, 80, 150],
    },
    "medium_jungle_green": {
      "name": "Medium Jungle Green",
      "rgb": [28, 53, 45],
    },
    "medium_lavender_magenta": {
      "name": "Medium Lavender Magenta",
      "rgb": [221, 160, 221],
    },
    "medium_orchid": {
      "name": "Medium Orchid",
      "rgb": [186, 85, 211],
    },
    "medium_persian_blue": {
      "name": "Medium Persian Blue",
      "rgb": [0, 103, 165],
    },
    "medium_purple": {
      "name": "Medium Purple",
      "rgb": [147, 112, 219],
    },
    "medium_red_violet": {
      "name": "Medium Red-Violet",
      "rgb": [187, 51, 133],
    },
    "medium_ruby": {
      "name": "Medium Ruby",
      "rgb": [170, 64, 105],
    },
    "medium_sea_green": {
      "name": "Medium Sea Green",
      "rgb": [60, 179, 113],
    },
    "medium_slate_blue": {
      "name": "Medium Slate Blue",
      "rgb": [123, 104, 238],
    },
    "medium_spring_bud": {
      "name": "Medium Spring Bud",
      "rgb": [201, 220, 135],
    },
    "medium_spring_green": {
      "name": "Medium Spring Green",
      "rgb": [0, 250, 154],
    },
    "medium_taupe": {
      "name": "Medium Taupe",
      "rgb": [103, 76, 71],
    },
    "medium_turquoise": {
      "name": "Medium Turquoise",
      "rgb": [72, 209, 204],
    },
    "medium_tuscan_red": {
      "name": "Medium Tuscan Red",
      "rgb": [121, 68, 59],
    },
    "medium_vermilion": {
      "name": "Medium Vermilion",
      "rgb": [217, 96, 59],
    },
    "medium_violet_red": {
      "name": "Medium Violet-Red",
      "rgb": [199, 21, 133],
    },
    "mellow_apricot": {
      "name": "Mellow Apricot",
      "rgb": [248, 184, 120],
    },
    "mellow_yellow": {
      "name": "Mellow Yellow",
      "rgb": [248, 222, 126],
    },
    "melon": {
      "name": "Melon",
      "rgb": [253, 188, 180],
    },
    "midnight_blue": {
      "name": "Midnight Blue",
      "rgb": [25, 25, 112],
    },
    "midnight_green_eagle_green": {
      "name": "Midnight Green (Eagle Green)",
      "rgb": [0, 73, 83],
    },
    "mikado_yellow": {
      "name": "Mikado Yellow",
      "rgb": [255, 196, 12],
    },
    "mint": {
      "name": "Mint",
      "rgb": [62, 180, 137],
    },
    "mint_cream": {
      "name": "Mint Cream",
      "rgb": [245, 255, 250],
    },
    "mint_green": {
      "name": "Mint Green",
      "rgb": [152, 255, 152],
    },
    "misty_rose": {
      "name": "Misty Rose",
      "rgb": [255, 228, 225],
    },
    "moccasin": {
      "name": "Moccasin",
      "rgb": [250, 235, 215],
    },
    "mode_beige": {
      "name": "Mode Beige",
      "rgb": [150, 113, 23],
    },
    "moonstone_blue": {
      "name": "Moonstone Blue",
      "rgb": [115, 169, 194],
    },
    "mordant_red_19": {
      "name": "Mordant Red 19",
      "rgb": [174, 12, 0],
    },
    "moss_green": {
      "name": "Moss Green",
      "rgb": [173, 223, 173],
    },
    "mountain_meadow": {
      "name": "Mountain Meadow",
      "rgb": [48, 186, 143],
    },
    "mountbatten_pink": {
      "name": "Mountbatten Pink",
      "rgb": [153, 122, 141],
    },
    "msu_green": {
      "name": "Msu Green",
      "rgb": [24, 69, 59],
    },
    "mulberry": {
      "name": "Mulberry",
      "rgb": [197, 75, 140],
    },
    "mustard": {
      "name": "Mustard",
      "rgb": [255, 219, 88],
    },
    "myrtle": {
      "name": "Myrtle",
      "rgb": [33, 66, 30],
    },
    "nadeshiko_pink": {
      "name": "Nadeshiko Pink",
      "rgb": [246, 173, 198],
    },
    "napier_green": {
      "name": "Napier Green",
      "rgb": [42, 128, 0],
    },
    "naples_yellow": {
      "name": "Naples Yellow",
      "rgb": [250, 218, 94],
    },
    "navajo_white": {
      "name": "Navajo White",
      "rgb": [255, 222, 173],
    },
    "navy_blue": {
      "name": "Navy Blue",
      "rgb": [0, 0, 128],
    },
    "neon_carrot": {
      "name": "Neon Carrot",
      "rgb": [255, 163, 67],
    },
    "neon_fuchsia": {
      "name": "Neon Fuchsia",
      "rgb": [254, 65, 100],
    },
    "neon_green": {
      "name": "Neon Green",
      "rgb": [57, 255, 20],
    },
    "new_york_pink": {
      "name": "New York Pink",
      "rgb": [215, 131, 127],
    },
    "non_photo_blue": {
      "name": "Non-Photo Blue",
      "rgb": [164, 221, 237],
    },
    "north_texas_green": {
      "name": "North Texas Green",
      "rgb": [5, 144, 51],
    },
    "ocean_boat_blue": {
      "name": "Ocean Boat Blue",
      "rgb": [0, 119, 190],
    },
    "ochre": {
      "name": "Ochre",
      "rgb": [204, 119, 34],
    },
    "office_green": {
      "name": "Office Green",
      "rgb": [0, 128, 0],
    },
    "old_gold": {
      "name": "Old Gold",
      "rgb": [207, 181, 59],
    },
    "old_lace": {
      "name": "Old Lace",
      "rgb": [253, 245, 230],
    },
    "old_lavender": {
      "name": "Old Lavender",
      "rgb": [121, 104, 120],
    },
    "old_mauve": {
      "name": "Old Mauve",
      "rgb": [103, 49, 71],
    },
    "old_rose": {
      "name": "Old Rose",
      "rgb": [192, 128, 129],
    },
    "olive": {
      "name": "Olive",
      "rgb": [128, 128, 0],
    },
    "olive_drab_7": {
      "name": "Olive Drab #7",
      "rgb": [60, 52, 31],
    },
    "olive_drab_web_olive_drab_3": {
      "name": "Olive Drab (Web) (Olive Drab #3)",
      "rgb": [107, 142, 35],
    },
    "olivine": {
      "name": "Olivine",
      "rgb": [154, 185, 115],
    },
    "onyx": {
      "name": "Onyx",
      "rgb": [53, 56, 57],
    },
    "opera_mauve": {
      "name": "Opera Mauve",
      "rgb": [183, 132, 167],
    },
    "orange_color_wheel": {
      "name": "Orange (Color Wheel)",
      "rgb": [255, 127, 0],
    },
    "orange_peel": {
      "name": "Orange Peel",
      "rgb": [255, 159, 0],
    },
    "orange_red": {
      "name": "Orange-Red",
      "rgb": [255, 69, 0],
    },
    "orange_ryb": {
      "name": "Orange (Ryb)",
      "rgb": [251, 153, 2],
    },
    "orange_web_color": {
      "name": "Orange (Web Color)",
      "rgb": [255, 165, 0],
    },
    "orchid": {
      "name": "Orchid",
      "rgb": [218, 112, 214],
    },
    "otter_brown": {
      "name": "Otter Brown",
      "rgb": [101, 67, 33],
    },
    "ou_crimson_red": {
      "name": "Ou Crimson Red",
      "rgb": [153, 0, 0],
    },
    "outer_space": {
      "name": "Outer Space",
      "rgb": [65, 74, 76],
    },
    "outrageous_orange": {
      "name": "Outrageous Orange",
      "rgb": [255, 110, 74],
    },
    "oxford_blue": {
      "name": "Oxford Blue",
      "rgb": [0, 33, 71],
    },
    "pakistan_green": {
      "name": "Pakistan Green",
      "rgb": [0, 102, 0],
    },
    "palatinate_blue": {
      "name": "Palatinate Blue",
      "rgb": [39, 59, 226],
    },
    "palatinate_purple": {
      "name": "Palatinate Purple",
      "rgb": [104, 40, 96],
    },
    "pale_aqua": {
      "name": "Pale Aqua",
      "rgb": [188, 212, 230],
    },
    "pale_blue": {
      "name": "Pale Blue",
      "rgb": [175, 238, 238],
    },
    "pale_brown": {
      "name": "Pale Brown",
      "rgb": [152, 118, 84],
    },
    "pale_carmine": {
      "name": "Pale Carmine",
      "rgb": [175, 64, 53],
    },
    "pale_cerulean": {
      "name": "Pale Cerulean",
      "rgb": [155, 196, 226],
    },
    "pale_chestnut": {
      "name": "Pale Chestnut",
      "rgb": [221, 173, 175],
    },
    "pale_copper": {
      "name": "Pale Copper",
      "rgb": [218, 138, 103],
    },
    "pale_cornflower_blue": {
      "name": "Pale Cornflower Blue",
      "rgb": [171, 205, 239],
    },
    "pale_gold": {
      "name": "Pale Gold",
      "rgb": [230, 190, 138],
    },
    "pale_goldenrod": {
      "name": "Pale Goldenrod",
      "rgb": [238, 232, 170],
    },
    "pale_green": {
      "name": "Pale Green",
      "rgb": [152, 251, 152],
    },
    "pale_lavender": {
      "name": "Pale Lavender",
      "rgb": [220, 208, 255],
    },
    "pale_magenta": {
      "name": "Pale Magenta",
      "rgb": [249, 132, 229],
    },
    "pale_pink": {
      "name": "Pale Pink",
      "rgb": [250, 218, 221],
    },
    "pale_plum": {
      "name": "Pale Plum",
      "rgb": [221, 160, 221],
    },
    "pale_red_violet": {
      "name": "Pale Red-Violet",
      "rgb": [219, 112, 147],
    },
    "pale_robin_egg_blue": {
      "name": "Pale Robin Egg Blue",
      "rgb": [150, 222, 209],
    },
    "pale_silver": {
      "name": "Pale Silver",
      "rgb": [201, 192, 187],
    },
    "pale_spring_bud": {
      "name": "Pale Spring Bud",
      "rgb": [236, 235, 189],
    },
    "pale_taupe": {
      "name": "Pale Taupe",
      "rgb": [188, 152, 126],
    },
    "pale_violet_red": {
      "name": "Pale Violet-Red",
      "rgb": [219, 112, 147],
    },
    "pansy_purple": {
      "name": "Pansy Purple",
      "rgb": [120, 24, 74],
    },
    "papaya_whip": {
      "name": "Papaya Whip",
      "rgb": [255, 239, 213],
    },
    "paris_green": {
      "name": "Paris Green",
      "rgb": [80, 200, 120],
    },
    "pastel_blue": {
      "name": "Pastel Blue",
      "rgb": [174, 198, 207],
    },
    "pastel_brown": {
      "name": "Pastel Brown",
      "rgb": [131, 105, 83],
    },
    "pastel_gray": {
      "name": "Pastel Gray",
      "rgb": [207, 207, 196],
    },
    "pastel_green": {
      "name": "Pastel Green",
      "rgb": [119, 221, 119],
    },
    "pastel_magenta": {
      "name": "Pastel Magenta",
      "rgb": [244, 154, 194],
    },
    "pastel_orange": {
      "name": "Pastel Orange",
      "rgb": [255, 179, 71],
    },
    "pastel_pink": {
      "name": "Pastel Pink",
      "rgb": [222, 165, 164],
    },
    "pastel_purple": {
      "name": "Pastel Purple",
      "rgb": [179, 158, 181],
    },
    "pastel_red": {
      "name": "Pastel Red",
      "rgb": [255, 105, 97],
    },
    "pastel_violet": {
      "name": "Pastel Violet",
      "rgb": [203, 153, 201],
    },
    "pastel_yellow": {
      "name": "Pastel Yellow",
      "rgb": [253, 253, 150],
    },
    "patriarch": {
      "name": "Patriarch",
      "rgb": [128, 0, 128],
    },
    "payne_s_grey": {
      "name": "Payne'S Grey",
      "rgb": [83, 104, 120],
    },
    "peach": {
      "name": "Peach",
      "rgb": [255, 229, 180],
    },
    "peach_crayola": {
      "name": "Peach (Crayola)",
      "rgb": [255, 203, 164],
    },
    "peach_orange": {
      "name": "Peach-Orange",
      "rgb": [255, 204, 153],
    },
    "peach_puff": {
      "name": "Peach Puff",
      "rgb": [255, 218, 185],
    },
    "peach_yellow": {
      "name": "Peach-Yellow",
      "rgb": [250, 223, 173],
    },
    "pear": {
      "name": "Pear",
      "rgb": [209, 226, 49],
    },
    "pearl": {
      "name": "Pearl",
      "rgb": [234, 224, 200],
    },
    "pearl_aqua": {
      "name": "Pearl Aqua",
      "rgb": [136, 216, 192],
    },
    "pearly_purple": {
      "name": "Pearly Purple",
      "rgb": [183, 104, 162],
    },
    "peridot": {
      "name": "Peridot",
      "rgb": [230, 226, 0],
    },
    "periwinkle": {
      "name": "Periwinkle",
      "rgb": [204, 204, 255],
    },
    "persian_blue": {
      "name": "Persian Blue",
      "rgb": [28, 57, 187],
    },
    "persian_green": {
      "name": "Persian Green",
      "rgb": [0, 166, 147],
    },
    "persian_indigo": {
      "name": "Persian Indigo",
      "rgb": [50, 18, 122],
    },
    "persian_orange": {
      "name": "Persian Orange",
      "rgb": [217, 144, 88],
    },
    "persian_pink": {
      "name": "Persian Pink",
      "rgb": [247, 127, 190],
    },
    "persian_plum": {
      "name": "Persian Plum",
      "rgb": [112, 28, 28],
    },
    "persian_red": {
      "name": "Persian Red",
      "rgb": [204, 51, 51],
    },
    "persian_rose": {
      "name": "Persian Rose",
      "rgb": [254, 40, 162],
    },
    "persimmon": {
      "name": "Persimmon",
      "rgb": [236, 88, 0],
    },
    "peru": {
      "name": "Peru",
      "rgb": [205, 133, 63],
    },
    "phlox": {
      "name": "Phlox",
      "rgb": [223, 0, 255],
    },
    "phthalo_blue": {
      "name": "Phthalo Blue",
      "rgb": [0, 15, 137],
    },
    "phthalo_green": {
      "name": "Phthalo Green",
      "rgb": [18, 53, 36],
    },
    "piggy_pink": {
      "name": "Piggy Pink",
      "rgb": [253, 221, 230],
    },
    "pine_green": {
      "name": "Pine Green",
      "rgb": [1, 121, 111],
    },
    "pink": {
      "name": "Pink",
      "rgb": [255, 192, 203],
    },
    "pink_lace": {
      "name": "Pink Lace",
      "rgb": [255, 221, 244],
    },
    "pink_orange": {
      "name": "Pink-Orange",
      "rgb": [255, 153, 102],
    },
    "pink_pearl": {
      "name": "Pink Pearl",
      "rgb": [231, 172, 207],
    },
    "pink_sherbet": {
      "name": "Pink Sherbet",
      "rgb": [247, 143, 167],
    },
    "pistachio": {
      "name": "Pistachio",
      "rgb": [147, 197, 114],
    },
    "platinum": {
      "name": "Platinum",
      "rgb": [229, 228, 226],
    },
    "plum_traditional": {
      "name": "Plum (Traditional)",
      "rgb": [142, 69, 133],
    },
    "plum_web": {
      "name": "Plum (Web)",
      "rgb": [221, 160, 221],
    },
    "portland_orange": {
      "name": "Portland Orange",
      "rgb": [255, 90, 54],
    },
    "powder_blue_web": {
      "name": "Powder Blue (Web)",
      "rgb": [176, 224, 230],
    },
    "princeton_orange": {
      "name": "Princeton Orange",
      "rgb": [255, 143, 0],
    },
    "prune": {
      "name": "Prune",
      "rgb": [112, 28, 28],
    },
    "prussian_blue": {
      "name": "Prussian Blue",
      "rgb": [0, 49, 83],
    },
    "psychedelic_purple": {
      "name": "Psychedelic Purple",
      "rgb": [223, 0, 255],
    },
    "puce": {
      "name": "Puce",
      "rgb": [204, 136, 153],
    },
    "pumpkin": {
      "name": "Pumpkin",
      "rgb": [255, 117, 24],
    },
    "purple_heart": {
      "name": "Purple Heart",
      "rgb": [105, 53, 156],
    },
    "purple_html_css": {
      "name": "Purple (Html/Css)",
      "rgb": [128, 0, 128],
    },
    "purple_mountain_majesty": {
      "name": "Purple Mountain Majesty",
      "rgb": [150, 120, 182],
    },
    "purple_munsell": {
      "name": "Purple (Munsell)",
      "rgb": [159, 0, 197],
    },
    "purple_pizzazz": {
      "name": "Purple Pizzazz",
      "rgb": [254, 78, 218],
    },
    "purple_taupe": {
      "name": "Purple Taupe",
      "rgb": [80, 64, 77],
    },
    "purple_x11": {
      "name": "Purple (X11)",
      "rgb": [160, 32, 240],
    },
    "quartz": {
      "name": "Quartz",
      "rgb": [81, 72, 79],
    },
    "rackley": {
      "name": "Rackley",
      "rgb": [93, 138, 168],
    },
    "radical_red": {
      "name": "Radical Red",
      "rgb": [255, 53, 94],
    },
    "rajah": {
      "name": "Rajah",
      "rgb": [251, 171, 96],
    },
    "raspberry": {
      "name": "Raspberry",
      "rgb": [227, 11, 93],
    },
    "raspberry_glace": {
      "name": "Raspberry Glace",
      "rgb": [145, 95, 109],
    },
    "raspberry_pink": {
      "name": "Raspberry Pink",
      "rgb": [226, 80, 152],
    },
    "raspberry_rose": {
      "name": "Raspberry Rose",
      "rgb": [179, 68, 108],
    },
    "raw_umber": {
      "name": "Raw Umber",
      "rgb": [130, 102, 68],
    },
    "razzle_dazzle_rose": {
      "name": "Razzle Dazzle Rose",
      "rgb": [255, 51, 204],
    },
    "razzmatazz": {
      "name": "Razzmatazz",
      "rgb": [227, 37, 107],
    },
    "red": {
      "name": "Red",
      "rgb": [255, 0, 0],
    },
    "red_brown": {
      "name": "Red-Brown",
      "rgb": [165, 42, 42],
    },
    "red_devil": {
      "name": "Red Devil",
      "rgb": [134, 1, 17],
    },
    "red_munsell": {
      "name": "Red (Munsell)",
      "rgb": [242, 0, 60],
    },
    "red_ncs": {
      "name": "Red (Ncs)",
      "rgb": [196, 2, 51],
    },
    "red_orange": {
      "name": "Red-Orange",
      "rgb": [255, 83, 73],
    },
    "red_pigment": {
      "name": "Red (Pigment)",
      "rgb": [237, 28, 36],
    },
    "red_ryb": {
      "name": "Red (Ryb)",
      "rgb": [254, 39, 18],
    },
    "red_violet": {
      "name": "Red-Violet",
      "rgb": [199, 21, 133],
    },
    "redwood": {
      "name": "Redwood",
      "rgb": [171, 78, 82],
    },
    "regalia": {
      "name": "Regalia",
      "rgb": [82, 45, 128],
    },
    "resolution_blue": {
      "name": "Resolution Blue",
      "rgb": [0, 35, 135],
    },
    "rich_black": {
      "name": "Rich Black",
      "rgb": [0, 64, 64],
    },
    "rich_brilliant_lavender": {
      "name": "Rich Brilliant Lavender",
      "rgb": [241, 167, 254],
    },
    "rich_carmine": {
      "name": "Rich Carmine",
      "rgb": [215, 0, 64],
    },
    "rich_electric_blue": {
      "name": "Rich Electric Blue",
      "rgb": [8, 146, 208],
    },
    "rich_lavender": {
      "name": "Rich Lavender",
      "rgb": [167, 107, 207],
    },
    "rich_lilac": {
      "name": "Rich Lilac",
      "rgb": [182, 102, 210],
    },
    "rich_maroon": {
      "name": "Rich Maroon",
      "rgb": [176, 48, 96],
    },
    "rifle_green": {
      "name": "Rifle Green",
      "rgb": [65, 72, 51],
    },
    "robin_egg_blue": {
      "name": "Robin Egg Blue",
      "rgb": [0, 204, 204],
    },
    "rose": {
      "name": "Rose",
      "rgb": [255, 0, 127],
    },
    "rose_bonbon": {
      "name": "Rose Bonbon",
      "rgb": [249, 66, 158],
    },
    "rose_ebony": {
      "name": "Rose Ebony",
      "rgb": [103, 72, 70],
    },
    "rose_gold": {
      "name": "Rose Gold",
      "rgb": [183, 110, 121],
    },
    "rose_madder": {
      "name": "Rose Madder",
      "rgb": [227, 38, 54],
    },
    "rose_pink": {
      "name": "Rose Pink",
      "rgb": [255, 102, 204],
    },
    "rose_quartz": {
      "name": "Rose Quartz",
      "rgb": [170, 152, 169],
    },
    "rose_taupe": {
      "name": "Rose Taupe",
      "rgb": [144, 93, 93],
    },
    "rose_vale": {
      "name": "Rose Vale",
      "rgb": [171, 78, 82],
    },
    "rosewood": {
      "name": "Rosewood",
      "rgb": [101, 0, 11],
    },
    "rosso_corsa": {
      "name": "Rosso Corsa",
      "rgb": [212, 0, 0],
    },
    "rosy_brown": {
      "name": "Rosy Brown",
      "rgb": [188, 143, 143],
    },
    "royal_azure": {
      "name": "Royal Azure",
      "rgb": [0, 56, 168],
    },
    "royal_blue_traditional": {
      "name": "Royal Blue (Traditional)",
      "rgb": [0, 35, 102],
    },
    "royal_blue_web": {
      "name": "Royal Blue (Web)",
      "rgb": [65, 105, 225],
    },
    "royal_fuchsia": {
      "name": "Royal Fuchsia",
      "rgb": [202, 44, 146],
    },
    "royal_purple": {
      "name": "Royal Purple",
      "rgb": [120, 81, 169],
    },
    "royal_yellow": {
      "name": "Royal Yellow",
      "rgb": [250, 218, 94],
    },
    "rubine_red": {
      "name": "Rubine Red",
      "rgb": [209, 0, 86],
    },
    "ruby": {
      "name": "Ruby",
      "rgb": [224, 17, 95],
    },
    "ruby_red": {
      "name": "Ruby Red",
      "rgb": [155, 17, 30],
    },
    "ruddy": {
      "name": "Ruddy",
      "rgb": [255, 0, 40],
    },
    "ruddy_brown": {
      "name": "Ruddy Brown",
      "rgb": [187, 101, 40],
    },
    "ruddy_pink": {
      "name": "Ruddy Pink",
      "rgb": [225, 142, 150],
    },
    "rufous": {
      "name": "Rufous",
      "rgb": [168, 28, 7],
    },
    "russet": {
      "name": "Russet",
      "rgb": [128, 70, 27],
    },
    "rust": {
      "name": "Rust",
      "rgb": [183, 65, 14],
    },
    "rusty_red": {
      "name": "Rusty Red",
      "rgb": [218, 44, 67],
    },
    "sacramento_state_green": {
      "name": "Sacramento State Green",
      "rgb": [0, 86, 63],
    },
    "saddle_brown": {
      "name": "Saddle Brown",
      "rgb": [139, 69, 19],
    },
    "safety_orange_blaze_orange": {
      "name": "Safety Orange (Blaze Orange)",
      "rgb": [255, 103, 0],
    },
    "saffron": {
      "name": "Saffron",
      "rgb": [244, 196, 48],
    },
    "salmon": {
      "name": "Salmon",
      "rgb": [255, 140, 105],
    },
    "salmon_pink": {
      "name": "Salmon Pink",
      "rgb": [255, 145, 164],
    },
    "sand": {
      "name": "Sand",
      "rgb": [194, 178, 128],
    },
    "sand_dune": {
      "name": "Sand Dune",
      "rgb": [150, 113, 23],
    },
    "sandstorm": {
      "name": "Sandstorm",
      "rgb": [236, 213, 64],
    },
    "sandy_brown": {
      "name": "Sandy Brown",
      "rgb": [244, 164, 96],
    },
    "sandy_taupe": {
      "name": "Sandy Taupe",
      "rgb": [150, 113, 23],
    },
    "sangria": {
      "name": "Sangria",
      "rgb": [146, 0, 10],
    },
    "sap_green": {
      "name": "Sap Green",
      "rgb": [80, 125, 42],
    },
    "sapphire": {
      "name": "Sapphire",
      "rgb": [15, 82, 186],
    },
    "sapphire_blue": {
      "name": "Sapphire Blue",
      "rgb": [0, 103, 165],
    },
    "satin_sheen_gold": {
      "name": "Satin Sheen Gold",
      "rgb": [203, 161, 53],
    },
    "scarlet": {
      "name": "Scarlet",
      "rgb": [255, 36, 0],
    },
    "scarlet_crayola": {
      "name": "Scarlet (Crayola)",
      "rgb": [253, 14, 53],
    },
    "school_bus_yellow": {
      "name": "School Bus Yellow",
      "rgb": [255, 216, 0],
    },
    "screamin_green": {
      "name": "Screamin' Green",
      "rgb": [118, 255, 122],
    },
    "sea_blue": {
      "name": "Sea Blue",
      "rgb": [0, 105, 148],
    },
    "sea_green": {
      "name": "Sea Green",
      "rgb": [46, 139, 87],
    },
    "seal_brown": {
      "name": "Seal Brown",
      "rgb": [50, 20, 20],
    },
    "seashell": {
      "name": "Seashell",
      "rgb": [255, 245, 238],
    },
    "selective_yellow": {
      "name": "Selective Yellow",
      "rgb": [255, 186, 0],
    },
    "sepia": {
      "name": "Sepia",
      "rgb": [112, 66, 20],
    },
    "shadow": {
      "name": "Shadow",
      "rgb": [138, 121, 93],
    },
    "shamrock_green": {
      "name": "Shamrock Green",
      "rgb": [0, 158, 96],
    },
    "shocking_pink": {
      "name": "Shocking Pink",
      "rgb": [252, 15, 192],
    },
    "shocking_pink_crayola": {
      "name": "Shocking Pink (Crayola)",
      "rgb": [255, 111, 255],
    },
    "sienna": {
      "name": "Sienna",
      "rgb": [136, 45, 23],
    },
    "silver": {
      "name": "Silver",
      "rgb": [192, 192, 192],
    },
    "sinopia": {
      "name": "Sinopia",
      "rgb": [203, 65, 11],
    },
    "skobeloff": {
      "name": "Skobeloff",
      "rgb": [0, 116, 116],
    },
    "sky_blue": {
      "name": "Sky Blue",
      "rgb": [135, 206, 235],
    },
    "sky_magenta": {
      "name": "Sky Magenta",
      "rgb": [207, 113, 175],
    },
    "slate_blue": {
      "name": "Slate Blue",
      "rgb": [106, 90, 205],
    },
    "slate_gray": {
      "name": "Slate Gray",
      "rgb": [112, 128, 144],
    },
    "smalt_dark_powder_blue": {
      "name": "Smalt (Dark Powder Blue)",
      "rgb": [0, 51, 153],
    },
    "smokey_topaz": {
      "name": "Smokey Topaz",
      "rgb": [147, 61, 65],
    },
    "smoky_black": {
      "name": "Smoky Black",
      "rgb": [16, 12, 8],
    },
    "snow": {
      "name": "Snow",
      "rgb": [255, 250, 250],
    },
    "spiro_disco_ball": {
      "name": "Spiro Disco Ball",
      "rgb": [15, 192, 252],
    },
    "spring_bud": {
      "name": "Spring Bud",
      "rgb": [167, 252, 0],
    },
    "spring_green": {
      "name": "Spring Green",
      "rgb": [0, 255, 127],
    },
    "st_patrick_s_blue": {
      "name": "St. Patrick'S Blue",
      "rgb": [35, 41, 122],
    },
    "steel_blue": {
      "name": "Steel Blue",
      "rgb": [70, 130, 180],
    },
    "stil_de_grain_yellow": {
      "name": "Stil De Grain Yellow",
      "rgb": [250, 218, 94],
    },
    "stizza": {
      "name": "Stizza",
      "rgb": [153, 0, 0],
    },
    "stormcloud": {
      "name": "Stormcloud",
      "rgb": [79, 102, 106],
    },
    "straw": {
      "name": "Straw",
      "rgb": [228, 217, 111],
    },
    "sunglow": {
      "name": "Sunglow",
      "rgb": [255, 204, 51],
    },
    "sunset": {
      "name": "Sunset",
      "rgb": [250, 214, 165],
    },
    "tan": {
      "name": "Tan",
      "rgb": [210, 180, 140],
    },
    "tangelo": {
      "name": "Tangelo",
      "rgb": [249, 77, 0],
    },
    "tangerine": {
      "name": "Tangerine",
      "rgb": [242, 133, 0],
    },
    "tangerine_yellow": {
      "name": "Tangerine Yellow",
      "rgb": [255, 204, 0],
    },
    "tango_pink": {
      "name": "Tango Pink",
      "rgb": [228, 113, 122],
    },
    "taupe": {
      "name": "Taupe",
      "rgb": [72, 60, 50],
    },
    "taupe_gray": {
      "name": "Taupe Gray",
      "rgb": [139, 133, 137],
    },
    "tea_green": {
      "name": "Tea Green",
      "rgb": [208, 240, 192],
    },
    "tea_rose_orange": {
      "name": "Tea Rose (Orange)",
      "rgb": [248, 131, 121],
    },
    "tea_rose_rose": {
      "name": "Tea Rose (Rose)",
      "rgb": [244, 194, 194],
    },
    "teal": {
      "name": "Teal",
      "rgb": [0, 128, 128],
    },
    "teal_blue": {
      "name": "Teal Blue",
      "rgb": [54, 117, 136],
    },
    "teal_green": {
      "name": "Teal Green",
      "rgb": [0, 130, 127],
    },
    "telemagenta": {
      "name": "Telemagenta",
      "rgb": [207, 52, 118],
    },
    "tenn_tawny": {
      "name": "Tenné (Tawny)",
      "rgb": [205, 87, 0],
    },
    "terra_cotta": {
      "name": "Terra Cotta",
      "rgb": [226, 114, 91],
    },
    "thistle": {
      "name": "Thistle",
      "rgb": [216, 191, 216],
    },
    "thulian_pink": {
      "name": "Thulian Pink",
      "rgb": [222, 111, 161],
    },
    "tickle_me_pink": {
      "name": "Tickle Me Pink",
      "rgb": [252, 137, 172],
    },
    "tiffany_blue": {
      "name": "Tiffany Blue",
      "rgb": [10, 186, 181],
    },
    "tiger_s_eye": {
      "name": "Tiger'S Eye",
      "rgb": [224, 141, 60],
    },
    "timberwolf": {
      "name": "Timberwolf",
      "rgb": [219, 215, 210],
    },
    "titanium_yellow": {
      "name": "Titanium Yellow",
      "rgb": [238, 230, 0],
    },
    "tomato": {
      "name": "Tomato",
      "rgb": [255, 99, 71],
    },
    "toolbox": {
      "name": "Toolbox",
      "rgb": [116, 108, 192],
    },
    "topaz": {
      "name": "Topaz",
      "rgb": [255, 200, 124],
    },
    "tractor_red": {
      "name": "Tractor Red",
      "rgb": [253, 14, 53],
    },
    "trolley_grey": {
      "name": "Trolley Grey",
      "rgb": [128, 128, 128],
    },
    "tropical_rain_forest": {
      "name": "Tropical Rain Forest",
      "rgb": [0, 117, 94],
    },
    "true_blue": {
      "name": "True Blue",
      "rgb": [0, 115, 207],
    },
    "tufts_blue": {
      "name": "Tufts Blue",
      "rgb": [65, 125, 193],
    },
    "tumbleweed": {
      "name": "Tumbleweed",
      "rgb": [222, 170, 136],
    },
    "turkish_rose": {
      "name": "Turkish Rose",
      "rgb": [181, 114, 129],
    },
    "turquoise": {
      "name": "Turquoise",
      "rgb": [48, 213, 200],
    },
    "turquoise_blue": {
      "name": "Turquoise Blue",
      "rgb": [0, 255, 239],
    },
    "turquoise_green": {
      "name": "Turquoise Green",
      "rgb": [160, 214, 180],
    },
    "tuscan_red": {
      "name": "Tuscan Red",
      "rgb": [124, 72, 72],
    },
    "twilight_lavender": {
      "name": "Twilight Lavender",
      "rgb": [138, 73, 107],
    },
    "tyrian_purple": {
      "name": "Tyrian Purple",
      "rgb": [102, 2, 60],
    },
    "ua_blue": {
      "name": "Ua Blue",
      "rgb": [0, 51, 170],
    },
    "ua_red": {
      "name": "Ua Red",
      "rgb": [217, 0, 76],
    },
    "ube": {
      "name": "Ube",
      "rgb": [136, 120, 195],
    },
    "ucla_blue": {
      "name": "Ucla Blue",
      "rgb": [83, 104, 149],
    },
    "ucla_gold": {
      "name": "Ucla Gold",
      "rgb": [255, 179, 0],
    },
    "ufo_green": {
      "name": "Ufo Green",
      "rgb": [60, 208, 112],
    },
    "ultra_pink": {
      "name": "Ultra Pink",
      "rgb": [255, 111, 255],
    },
    "ultramarine": {
      "name": "Ultramarine",
      "rgb": [18, 10, 143],
    },
    "ultramarine_blue": {
      "name": "Ultramarine Blue",
      "rgb": [65, 102, 245],
    },
    "umber": {
      "name": "Umber",
      "rgb": [99, 81, 71],
    },
    "unbleached_silk": {
      "name": "Unbleached Silk",
      "rgb": [255, 221, 202],
    },
    "united_nations_blue": {
      "name": "United Nations Blue",
      "rgb": [91, 146, 229],
    },
    "university_of_california_gold": {
      "name": "University Of California Gold",
      "rgb": [183, 135, 39],
    },
    "unmellow_yellow": {
      "name": "Unmellow Yellow",
      "rgb": [255, 255, 102],
    },
    "up_forest_green": {
      "name": "Up Forest Green",
      "rgb": [1, 68, 33],
    },
    "up_maroon": {
      "name": "Up Maroon",
      "rgb": [123, 17, 19],
    },
    "upsdell_red": {
      "name": "Upsdell Red",
      "rgb": [174, 32, 41],
    },
    "urobilin": {
      "name": "Urobilin",
      "rgb": [225, 173, 33],
    },
    "usafa_blue": {
      "name": "Usafa Blue",
      "rgb": [0, 79, 152],
    },
    "usc_cardinal": {
      "name": "Usc Cardinal",
      "rgb": [153, 0, 0],
    },
    "usc_gold": {
      "name": "Usc Gold",
      "rgb": [255, 204, 0],
    },
    "utah_crimson": {
      "name": "Utah Crimson",
      "rgb": [211, 0, 63],
    },
    "vanilla": {
      "name": "Vanilla",
      "rgb": [243, 229, 171],
    },
    "vegas_gold": {
      "name": "Vegas Gold",
      "rgb": [197, 179, 88],
    },
    "venetian_red": {
      "name": "Venetian Red",
      "rgb": [200, 8, 21],
    },
    "verdigris": {
      "name": "Verdigris",
      "rgb": [67, 179, 174],
    },
    "vermilion_cinnabar": {
      "name": "Vermilion (Cinnabar)",
      "rgb": [227, 66, 52],
    },
    "vermilion_plochere": {
      "name": "Vermilion (Plochere)",
      "rgb": [217, 96, 59],
    },
    "veronica": {
      "name": "Veronica",
      "rgb": [160, 32, 240],
    },
    "violet": {
      "name": "Violet",
      "rgb": [143, 0, 255],
    },
    "violet_blue": {
      "name": "Violet-Blue",
      "rgb": [50, 74, 178],
    },
    "violet_color_wheel": {
      "name": "Violet (Color Wheel)",
      "rgb": [127, 0, 255],
    },
    "violet_ryb": {
      "name": "Violet (Ryb)",
      "rgb": [134, 1, 175],
    },
    "violet_web": {
      "name": "Violet (Web)",
      "rgb": [238, 130, 238],
    },
    "viridian": {
      "name": "Viridian",
      "rgb": [64, 130, 109],
    },
    "vivid_auburn": {
      "name": "Vivid Auburn",
      "rgb": [146, 39, 36],
    },
    "vivid_burgundy": {
      "name": "Vivid Burgundy",
      "rgb": [159, 29, 53],
    },
    "vivid_cerise": {
      "name": "Vivid Cerise",
      "rgb": [218, 29, 129],
    },
    "vivid_tangerine": {
      "name": "Vivid Tangerine",
      "rgb": [255, 160, 137],
    },
    "vivid_violet": {
      "name": "Vivid Violet",
      "rgb": [159, 0, 255],
    },
    "warm_black": {
      "name": "Warm Black",
      "rgb": [0, 66, 66],
    },
    "waterspout": {
      "name": "Waterspout",
      "rgb": [164, 244, 249],
    },
    "wenge": {
      "name": "Wenge",
      "rgb": [100, 84, 82],
    },
    "wheat": {
      "name": "Wheat",
      "rgb": [245, 222, 179],
    },
    "white": {
      "name": "White",
      "rgb": [255, 255, 255],
    },
    "white_smoke": {
      "name": "White Smoke",
      "rgb": [245, 245, 245],
    },
    "wild_blue_yonder": {
      "name": "Wild Blue Yonder",
      "rgb": [162, 173, 208],
    },
    "wild_strawberry": {
      "name": "Wild Strawberry",
      "rgb": [255, 67, 164],
    },
    "wild_watermelon": {
      "name": "Wild Watermelon",
      "rgb": [252, 108, 133],
    },
    "wine": {
      "name": "Wine",
      "rgb": [114, 47, 55],
    },
    "wine_dregs": {
      "name": "Wine Dregs",
      "rgb": [103, 49, 71],
    },
    "wisteria": {
      "name": "Wisteria",
      "rgb": [201, 160, 220],
    },
    "wood_brown": {
      "name": "Wood Brown",
      "rgb": [193, 154, 107],
    },
    "xanadu": {
      "name": "Xanadu",
      "rgb": [115, 134, 120],
    },
    "yale_blue": {
      "name": "Yale Blue",
      "rgb": [15, 77, 146],
    },
    "yellow": {
      "name": "Yellow",
      "rgb": [255, 255, 0],
    },
    "yellow_green": {
      "name": "Yellow-Green",
      "rgb": [154, 205, 50],
    },
    "yellow_munsell": {
      "name": "Yellow (Munsell)",
      "rgb": [239, 204, 0],
    },
    "yellow_ncs": {
      "name": "Yellow (Ncs)",
      "rgb": [255, 211, 0],
    },
    "yellow_orange": {
      "name": "Yellow Orange",
      "rgb": [255, 174, 66],
    },
    "yellow_process": {
      "name": "Yellow (Process)",
      "rgb": [255, 239, 0],
    },
    "yellow_ryb": {
      "name": "Yellow (Ryb)",
      "rgb": [254, 254, 51],
    },
    "zaffre": {
      "name": "Zaffre",
      "rgb": [0, 20, 168],
    },
    "zinnwaldite_brown": {
      "name": "Zinnwaldite Brown",
      "rgb": [44, 22, 8],
    },
  }