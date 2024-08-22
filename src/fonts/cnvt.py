import base64

def convert_ttf_to_base64(ttf_path, output_path):
    with open(ttf_path, "rb") as ttf_file:
        encoded_string = base64.b64encode(ttf_file.read()).decode('utf-8')
    
    with open(output_path, "w") as output_file:
        output_file.write(encoded_string)

convert_ttf_to_base64('Amiri.ttf', 'Amiri.txt')
