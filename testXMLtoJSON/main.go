package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"

	goxmltojson "github.com/basgys/goxml2json"
)

func main() {
	f, err := ioutil.ReadFile("filing_1800_0001104659-09-017676.xml")
	if err != nil {
		panic(err)
	}

	j, err := goxmltojson.Convert(bytes.NewReader(f))
	if err != nil {
		panic(err)
	}

	var jd map[string]interface{}

	err = json.Unmarshal(j.Bytes(), &jd)
	if err != nil {
		panic(err)
	}

	ioutil.WriteFile("out.json", j.Bytes(), 0777)

	fmt.Printf("%+v\n", jd)

	n := mapConvertToArray(jd)

	fmt.Printf("-------------------------------\n%+v", n)

	js, err := json.Marshal(&n)
	if err != nil {
		panic(err)
	}
	ioutil.WriteFile("out2.json", js, 0777)
}

// This function makes everything an array whether there is one item or multiple, so parsing is predictable with languages that are not JS
func mapConvertToArray(d map[string]interface{}) map[string]interface{} {
	for key, val := range d {
		if m, ok := val.(map[string]interface{}); ok {
			// If map, run recursively
			d[key] = mapConvertToArray(m)
		} else if _, ok := val.([]interface{}); ok {
			// If an array, leave as array
		} else {
			// If not an array or map, turn into an array
			d[key] = []interface{}{val}
		}
		// if m, ok := val.(map[string]interface{}); ok {
		// 	// This is another map, run recursively
		// 	d[key] = []map[string]interface{}{mapConvertToArray(m)}
		// }
	}
	return d
}
