// Widget ID
export const WIDGET_ID = "widget_example";

// Widget name
export const WIDGET_NAME = "Esempio"

// Widget permission
export const ADMIN = false;

// Widget dimension
export const WIDGET_DEFAULT_DIMENSION =  { w: 7, h: 10 };
export const WIDGET_MAX_DIMENSION =  { w: 10, h: 10 };
export const WIDGET_MIN_DIMENSION =  { w: 1, h: 1 };

// Widget style
export const BACKGROUND = "#fff";

// Widget configuration
export const CONFIGURATION = [
    {
        name: "Generale",
        options: [
            {
                name: "Colore pulsanti",
                key: "btn_color",
                type: "select",
                options: [
                    {
                        name: "Standard",
                        value: "standard"
                    },
                    {
                        name: "Rosso",
                        value: "red"
                    },
                    {
                        name: "Blu",
                        value: "blue"
                    }
                ]
            },
            {
                name: "Data compleanno",
                key: "birthday_date",
                type: "date"
            },
            {
                name: "Testo pulsanti bold",
                key: "btn_text_color",
                type: "checkbox"
            }
        ]
    }
];

// Default configuration
export const DEFAULT_CONFIGURATION = {
    btn_color: "red",
    birthday_date: null,
    btn_text_color: false
};

// Author
export const AUTHOR = "Mario Rossi";