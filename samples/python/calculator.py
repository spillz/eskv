import kivy
from kivy.app import App
from kivy.uix.label import Label
from kivy.lang import Builder


kv_layout = '''


FloatLayout:
    BoxLayout:
        display: display
        size_hint_x: None
        pos_hint: {'center_x': 0.5}
        orientation: 'vertical'
        width: self.height//2
        BoxLayout:
            size_hint_y: 0.2
            Label:
                id: display
                text: ''
        GridLayout:
            rows: 5
            cols: 4
            Button:
                text: 'DEL'
                on_press: display.text = display.text[:-1]
            Button:
                text: 'CE'            
                on_press: display.text = ''
            Button:
                text: '^'            
                on_press: display.text = display.text+self.text

            Button:
                text: '/'            
                on_press: display.text = display.text+self.text
            Button:
                text: '7'            
                on_press: display.text = display.text+self.text
            Button:
                text: '8'            
                on_press: display.text = display.text+self.text
            Button:
                text: '9'            
                on_press: display.text = display.text+self.text
            Button:
                text: 'X'            
                on_press: display.text = display.text+self.text
            Button:
                text: '4'            
                on_press: display.text = display.text+self.text
            Button:
                text: '5'            
                on_press: display.text = display.text+self.text
            Button:
                text: '6'            
                on_press: display.text = display.text+self.text
            Button:
                text: '-'
                on_press: display.text = display.text+self.text
            Button:
                text: '1'
                on_press: display.text = display.text+self.text
            Button:
                text: '2'            
                on_press: display.text = display.text+self.text
            Button:
                text: '3'            
                on_press: display.text = display.text+self.text
            Button:
                text: '+'            
                on_press: display.text = display.text+self.text
            Button:
                text: '+/-'            
                on_press: display.text=app.calc('-('display.text')')
            Button:
                text: '0'
                on_press: display.text = display.text+self.text
            Button:
                text: '.'            
                on_press: display.text = display.text+self.text
            Button:
                text: '='                        
                on_press: display.text=app.calc(display.text)

'''

class CalculatorApp(App):
    def build(self):
        layout = Builder.load_string(kv_layout)
        return layout
    def calc(self,text):
        try:
            return str(eval(text.replace('X','*').replace('^','**')))
        except:
            return "What are you doing Dave?"

app=CalculatorApp()
app.run()