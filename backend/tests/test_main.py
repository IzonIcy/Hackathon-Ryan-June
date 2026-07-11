import unittest


class MainStartupTests(unittest.TestCase):
    def test_main_starts_uvicorn(self):
        import main

        called = {}

        def fake_run(app, host=None, port=None, reload=False):
            called["app"] = app
            called["host"] = host
            called["port"] = port
            called["reload"] = reload

        main.uvicorn.run = fake_run

        main.main()

        self.assertIs(called["app"], main.app)
        self.assertEqual(called["host"], "0.0.0.0")
        self.assertEqual(called["port"], 8000)
        self.assertFalse(called["reload"])


if __name__ == "__main__":
    unittest.main()
