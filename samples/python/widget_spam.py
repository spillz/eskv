from kivy.app import App
from kivy.uix.widget import Widget
from kivy.uix.floatlayout import FloatLayout
from kivy.uix.button import Button
from kivy.graphics import Rectangle, Color
from kivy.vector import Vector
from kivy.clock import Clock
from random import random


class MovingWidget(Widget):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.vel = Vector(2 * (0.5 - random()), 2 * (0.5 - random()))

        with self.canvas:
            self.color = Color(random(), random(), random())
            self.rect = Rectangle(pos=self.pos, size=self.size)
        self.bind(pos=self.update_rect, size=self.update_rect)

    def update_rect(self, *args):
        self.rect.pos = self.pos
        self.rect.size = self.size

    def move(self):
        self.pos = Vector(*self.pos) + self.vel
        if self.x < 0 or (self.x + self.width) > self.parent.width:
            self.vel.x *= -1
        if self.y < 0 or (self.y + self.height) > self.parent.height:
            self.vel.y *= -1

    def on_touch_down(self, touch):
        if self.collide_point(*touch.pos):
            self.parent.remove_widget(self)


class Frame(Widget):
    counter = []
    def update(self, dt):
        self.counter.append(dt)
        if len(self.counter)>=60:
            print(sum(self.counter)/len(self.counter))
            self.counter.clear()
        for child in self.children:
            if isinstance(child, MovingWidget):
                child.move()


class WidgetSpamApp(App):
    def build(self):
        root = FloatLayout(size_hint=(1,1))
        frame = Frame(size_hint=(1.0, 0.9), pos_hint={'x':0,'top':0.1})
        add_btn = Button(text='Add 100 Widgets', size_hint=(0.4,0.1), pos_hint={'x':0,'y':0})
        clear_btn = Button(text='Clear', size_hint=(0.4,0.1), pos_hint={'right':1,'y':0})

        add_btn.bind(on_press=self.spawn_widgets)
        clear_btn.bind(on_press=self.clear_widgets)

        root.add_widget(frame)
        root.add_widget(add_btn)
        root.add_widget(clear_btn)
        Clock.schedule_interval(frame.update, 1.0 / 60.0)

        self.frame = frame

        return root

    def spawn_widgets(self, instance):
        for i in range(100):
            size = (20 * (random() + 1), 20 * (random() + 1))
            widget = MovingWidget(size=size, pos=(random() * (self.frame.width - size[0]), random() * (self.frame.height - size[1])))
            self.frame.add_widget(widget)

    def clear_widgets(self, instance):
        for child in list(self.frame.children):
            if isinstance(child, MovingWidget):
                self.frame.remove_widget(child)


if __name__ == '__main__':
    WidgetSpamApp().run()
